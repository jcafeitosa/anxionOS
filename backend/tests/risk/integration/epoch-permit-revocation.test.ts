import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { RISK_EVENT_TYPES } from "@anxionos/contracts/risk";
import {
	activateKillSwitch,
	createPgCommandJournalRepository,
	createRiskEpochBumpedConsumer,
	createRiskUnitOfWork,
	runPreTradeCheck,
	validateRiskPermit,
} from "@anxionos/risk";
import {
	RISK_TEST_INTENT_HASH,
	RISK_TEST_ORG_B,
	RISK_TEST_ORG_ID,
	RISK_TEST_PORTFOLIO_ID,
	RISK_TEST_RISK_EPOCH,
	seedActiveLimitPolicy,
	shouldRunPgIntegrationTests,
	withRiskPgHarness,
} from "../test-support";

function createDeps(pool: Parameters<typeof createRiskUnitOfWork>[0]) {
	return {
		unitOfWork: createRiskUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
	};
}

describe("risk epoch permit revocation (ANX-150 S4)", () => {
	test("G5-RK-02: epoch consumer revokes stale ISSUED permits after kill switch", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool);

			const check = await runPreTradeCheck(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_ID,
				intentHash: RISK_TEST_INTENT_HASH,
				notionalAmount: "10.0",
				authorityEpoch: 1,
				riskEpoch: RISK_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});
			expect(check.checkResult).toBe("PASS");
			expect(check.permitId).toMatch(/^rk_pmt_/);

			const activated = await activateKillSwitch(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				reason: "invalidate permits",
				activatedBy: "operator@test",
				scope: "ORGANIZATION",
			});

			const epochEvent = (
				await pool.query(
					`SELECT payload FROM domain_journal
					 WHERE owner_domain = 'risk' AND event_type = $1
					 ORDER BY occurred_at DESC LIMIT 1`,
					[RISK_EVENT_TYPES.EPOCH_BUMPED],
				)
			).rows[0]?.payload;
			expect(epochEvent).toBeTruthy();

			const consumer = createRiskEpochBumpedConsumer({ unitOfWork: deps.unitOfWork });
			const eventId = randomUUID();
			const result = await consumer.handle(epochEvent, eventId);
			expect(result.revokedPermitIds).toContain(check.permitId);

			const permitRow = await pool.query(
				`SELECT status FROM risk_permits WHERE id = $1`,
				[check.permitId],
			);
			expect(permitRow.rows[0]?.status).toBe("REVOKED");

			await expect(
				validateRiskPermit(deps, {
					organizationId: RISK_TEST_ORG_ID,
					permitId: check.permitId!,
					riskEpoch: RISK_TEST_RISK_EPOCH,
				}),
			).rejects.toMatchObject({ code: "RK_PERMIT_STALE" });

			const replay = await consumer.handle(epochEvent, eventId);
			expect(replay.idempotentReplay).toBe(true);
			expect(replay.revokedPermitIds).toEqual([]);

			const revokedEvents = await pool.query(
				`SELECT event_type FROM domain_journal
				 WHERE owner_domain = 'risk' AND event_type = $1`,
				[RISK_EVENT_TYPES.PERMIT_REVOKED],
			);
			expect(revokedEvents.rowCount).toBe(1);
			expect(activated.riskEpoch).toBe(RISK_TEST_RISK_EPOCH + 1);
		});
	});

	test("G5-RK-05: validateRiskPermit rejects cross-org permitId without leak", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool);

			const check = await runPreTradeCheck(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_ID,
				intentHash: RISK_TEST_INTENT_HASH,
				notionalAmount: "10.0",
				authorityEpoch: 1,
				riskEpoch: RISK_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});
			expect(check.permitId).toBeTruthy();

			await expect(
				validateRiskPermit(deps, {
					organizationId: RISK_TEST_ORG_B,
					permitId: check.permitId!,
					riskEpoch: RISK_TEST_RISK_EPOCH,
				}),
			).rejects.toMatchObject({ code: "RK_PERMIT_STALE" });
		});
	});

	test("G5-RK-01: epoch consumer cross-tenant dedup mismatch → RK_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const consumer = createRiskEpochBumpedConsumer({ unitOfWork: deps.unitOfWork });
			const eventId = randomUUID();

			await pool.query(
				`INSERT INTO risk_consumer_dedup (event_id, consumer_name, organization_id)
				 VALUES ($1, 'risk.epoch.bumped.revoke-stale-permits', $2)`,
				[eventId, RISK_TEST_ORG_B],
			);

			await expect(
				consumer.handle(
					{
						organizationId: RISK_TEST_ORG_ID,
						previousRiskEpoch: 0,
						currentRiskEpoch: 1,
						reason: "ActivateKillSwitch",
					},
					eventId,
				),
			).rejects.toMatchObject({ code: "RK_CROSS_TENANT" });
		});
	});
});
