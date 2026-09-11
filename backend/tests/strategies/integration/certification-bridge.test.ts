import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { EVALUATION_EVENT_TYPES } from "@anxionos/contracts/evaluation";
import { STRATEGIES_EVENT_TYPES } from "@anxionos/contracts/strategies";
import {
	activateDeployment,
	createCertificationIssuedConsumer,
	createPgCommandJournalRepository,
	createStrategiesUnitOfWork,
	StrategiesCommandError,
} from "@anxionos/strategies";
import {
	certifyStrategyVersionViaEvent,
	promoteVersionToEvaluated,
	STRATEGIES_TEST_BINDING,
	STRATEGIES_TEST_ORG_ID,
	seedBacktestedStrategyVersion,
	shouldRunPgIntegrationTests,
	withStrategiesPgHarness,
} from "../test-support";

const PORTFOLIO_ID = "pf_paper_sandbox_001";

describe("strategies evaluation certification bridge (ANX-147 S5)", () => {
	test("certification.issued consumer promotes EVALUATED to CERTIFIED and emits version.certified.v1", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const seeded = await seedBacktestedStrategyVersion(pool);
			await promoteVersionToEvaluated(pool, seeded.strategyVersionId);

			const eventId = randomUUID();
			const certificationId = `evl_crt_${randomUUID()}`;
			const result = await certifyStrategyVersionViaEvent(pool, {
				...seeded,
				eventId,
				certificationId,
			});

			expect(result.strategyVersionId).toBe(seeded.strategyVersionId);

			const versionRow = await pool.query(
				`SELECT lifecycle_state, revision FROM strategy_versions WHERE id = $1`,
				[seeded.strategyVersionId],
			);
			expect(versionRow.rows[0]?.lifecycle_state).toBe("CERTIFIED");

			const certifiedEvents = await pool.query(
				`SELECT payload FROM domain_journal
				 WHERE owner_domain = 'strategies' AND event_type = $1`,
				[STRATEGIES_EVENT_TYPES.VERSION_CERTIFIED],
			);
			expect(certifiedEvents.rowCount).toBe(1);
			expect(certifiedEvents.rows[0]?.payload).toMatchObject({
				strategyVersionId: seeded.strategyVersionId,
				certificationId,
			});

			const replay = await certifyStrategyVersionViaEvent(pool, {
				...seeded,
				eventId,
				certificationId,
			});
			expect(replay.idempotentReplay).toBe(true);
		});
	});

	test("direct SQL promote to CERTIFIED is not the supported path — consumer requires EVALUATED", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const seeded = await seedBacktestedStrategyVersion(pool);
			const unitOfWork = createStrategiesUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const consumer = createCertificationIssuedConsumer({
				unitOfWork,
				commandJournal,
			});

			await expect(
				consumer.handle(
					{
						certificationId: `evl_crt_${randomUUID()}`,
						organizationId: STRATEGIES_TEST_ORG_ID,
						subjectType: "strategy_version",
						strategyId: seeded.strategyId,
						strategyVersionId: seeded.strategyVersionId,
						issuedAt: new Date().toISOString(),
					},
					randomUUID(),
				),
			).rejects.toMatchObject({ code: "ST_INVALID_LIFECYCLE_TRANSITION" });

			const events = await pool.query(
				`SELECT event_type FROM domain_journal
				 WHERE owner_domain = 'strategies' AND event_type = $1`,
				[STRATEGIES_EVENT_TYPES.VERSION_CERTIFIED],
			);
			expect(events.rowCount).toBe(0);
		});
	});

	test("activateDeployment PAPER rejects BACKTESTED/EVALUATED with ST_CERTIFICATION_REQUIRED", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const backtested = await seedBacktestedStrategyVersion(pool);
			const { unitOfWork, commandJournal } = backtested;

			await expect(
				activateDeployment(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: STRATEGIES_TEST_ORG_ID,
						strategyId: backtested.strategyId,
						strategyVersionId: backtested.strategyVersionId,
						executionMode: "PAPER",
						portfolioId: PORTFOLIO_ID,
						bindingSnapshot: STRATEGIES_TEST_BINDING,
					},
				),
			).rejects.toBeInstanceOf(StrategiesCommandError);

			await expect(
				activateDeployment(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: STRATEGIES_TEST_ORG_ID,
						strategyId: backtested.strategyId,
						strategyVersionId: backtested.strategyVersionId,
						executionMode: "PAPER",
						portfolioId: PORTFOLIO_ID,
						bindingSnapshot: STRATEGIES_TEST_BINDING,
					},
				),
			).rejects.toMatchObject({ code: "ST_CERTIFICATION_REQUIRED" });

			await promoteVersionToEvaluated(pool, backtested.strategyVersionId);

			await expect(
				activateDeployment(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: STRATEGIES_TEST_ORG_ID,
						strategyId: backtested.strategyId,
						strategyVersionId: backtested.strategyVersionId,
						executionMode: "PAPER",
						portfolioId: PORTFOLIO_ID,
						bindingSnapshot: STRATEGIES_TEST_BINDING,
					},
				),
			).rejects.toMatchObject({ code: "ST_CERTIFICATION_REQUIRED" });
		});
	});

	test("activateDeployment PAPER succeeds after certification.issued consumer", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const seeded = await seedBacktestedStrategyVersion(pool);
			await promoteVersionToEvaluated(pool, seeded.strategyVersionId);
			await certifyStrategyVersionViaEvent(pool, seeded);

			const activated = await activateDeployment(
				{
					unitOfWork: seeded.unitOfWork,
					commandJournal: seeded.commandJournal,
				},
				{
					commandId: randomUUID(),
					organizationId: STRATEGIES_TEST_ORG_ID,
					strategyId: seeded.strategyId,
					strategyVersionId: seeded.strategyVersionId,
					executionMode: "PAPER",
					portfolioId: PORTFOLIO_ID,
					bindingSnapshot: STRATEGIES_TEST_BINDING,
				},
			);

			expect(activated.deploymentId).toMatch(/^st_dep_/);
		});
	});

	test("evaluation certification bridge contract exposes evaluation.certification.issued.v1", () => {
		expect(EVALUATION_EVENT_TYPES.CERTIFICATION_ISSUED).toBe(
			"evaluation.certification.issued.v1",
		);
	});
});
