import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	checkAuthority,
	createDecisionsUnitOfWork,
	createPgCapitalReservationQueryAdapter,
	createPgCommandJournalRepository,
	createRiskCheckCompletedConsumer,
	proposeDecision,
	submitIntent,
} from "@anxionos/decisions";
import {
	DECISIONS_TEST_CORRELATION_ID,
	DECISIONS_TEST_GRANT_ID,
	DECISIONS_TEST_ORG_ID,
	fulfillSubmitPreconditions,
	seedCapitalAccountForTests,
	shouldRunPgIntegrationTests,
	withDecisionsPgHarness,
} from "../test-support";

const ORG_A = DECISIONS_TEST_ORG_ID;
const ORG_B = "00000000-0000-4000-8000-000000000001";
const GRANT_ID = DECISIONS_TEST_GRANT_ID;
const CORRELATION_ID = DECISIONS_TEST_CORRELATION_ID;
const AUTHORITY_EPOCH = 1;
const INSTRUMENT_ID = "00000000-0000-4000-8000-000000000010";
const INTENT_HASH = "d".repeat(64);

function createDeps(pool: Parameters<typeof createDecisionsUnitOfWork>[0]) {
	return {
		unitOfWork: createDecisionsUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		capitalReservationQuery: createPgCapitalReservationQueryAdapter(pool),
	};
}

async function proposeCheckArm(
	deps: ReturnType<typeof createDeps>,
	organizationId = ORG_A,
) {
	const proposed = await proposeDecision(deps, {
		commandId: randomUUID(),
		organizationId,
		grantId: GRANT_ID,
		expectedAuthorityEpoch: AUTHORITY_EPOCH,
		correlationId: CORRELATION_ID,
	});
	await checkAuthority(deps, {
		commandId: randomUUID(),
		organizationId,
		decisionId: proposed.decisionId!,
		grantId: GRANT_ID,
		authorityEpoch: AUTHORITY_EPOCH,
		intentHash: INTENT_HASH,
	});
	return proposed;
}

describe("decisions risk + capital preconditions (ANX-149 S4)", () => {
	test("G3-DC-S2-06: submit without risk pass → DC_SUBMIT_PRECONDITION", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeCheckArm(deps);

			await expect(
				submitIntent(deps, {
					commandId: randomUUID(),
					organizationId: ORG_A,
					decisionId: proposed.decisionId!,
					intentHash: INTENT_HASH,
					instrumentId: INSTRUMENT_ID,
					side: "BUY",
					quantity: "1.0",
					price: "100.0",
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "DC_SUBMIT_PRECONDITION" });
		});
	});

	test("G3-DC-S2-07: submit with risk pass but without HELD capital reservation → DC_SUBMIT_PRECONDITION", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeCheckArm(deps);
			const accountId = await seedCapitalAccountForTests(pool);
			await fulfillSubmitPreconditions(pool, {
				organizationId: ORG_A,
				grantId: GRANT_ID,
				intentHash: INTENT_HASH,
				authorityEpoch: AUTHORITY_EPOCH,
				accountId,
			});

			await pool.query(
				`UPDATE capital_reservations SET status = 'RELEASED' WHERE intent_hash = $1`,
				[INTENT_HASH],
			);

			await expect(
				submitIntent(deps, {
					commandId: randomUUID(),
					organizationId: ORG_A,
					decisionId: proposed.decisionId!,
					intentHash: INTENT_HASH,
					instrumentId: INSTRUMENT_ID,
					side: "BUY",
					quantity: "1.0",
					price: "100.0",
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "DC_SUBMIT_PRECONDITION" });
		});
	});

	test("risk.check.completed consumer PASS transitions decision to CAPITAL_PENDING", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeCheckArm(deps);
			const accountId = await seedCapitalAccountForTests(pool);
			await fulfillSubmitPreconditions(pool, {
				organizationId: ORG_A,
				grantId: GRANT_ID,
				intentHash: INTENT_HASH,
				authorityEpoch: AUTHORITY_EPOCH,
				accountId,
			});

			const row = await pool.query(
				`SELECT status FROM decisions_records WHERE id = $1`,
				[proposed.decisionId],
			);
			expect(row.rows[0]?.status).toBe("CAPITAL_PENDING");

			const pre = await pool.query(
				`SELECT risk_check_result, capital_reservation_id
				 FROM decisions_submit_preconditions WHERE decision_id = $1`,
				[proposed.decisionId],
			);
			expect(pre.rows[0]?.risk_check_result).toBe("PASS");
			expect(pre.rows[0]?.capital_reservation_id).toMatch(/^cap_res_/);
		});
	});

	test("risk.check.completed DENY blocks submit with DC_RISK_DENIED", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeCheckArm(deps);
			const consumer = createRiskCheckCompletedConsumer({
				unitOfWork: createDecisionsUnitOfWork(pool),
			});
			await consumer.handle(
				{
					checkId: `rk_chk_${randomUUID()}`,
					organizationId: ORG_A,
					portfolioId: "00000000-0000-4000-8000-000000000040",
					intentHash: INTENT_HASH,
					checkResult: "DENY",
					denyReasonCode: "RK_LIMIT_EXCEEDED",
					notionalAmount: "100.0",
					authorityEpoch: AUTHORITY_EPOCH,
					riskEpoch: 1,
					executionMode: "SIMULATED",
				},
				randomUUID(),
			);

			await expect(
				submitIntent(deps, {
					commandId: randomUUID(),
					organizationId: ORG_A,
					decisionId: proposed.decisionId!,
					intentHash: INTENT_HASH,
					instrumentId: INSTRUMENT_ID,
					side: "BUY",
					quantity: "1.0",
					price: "100.0",
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "DC_RISK_DENIED" });
		});
	});

	test("happy path: risk + capital preconditions → submitIntent succeeds", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeCheckArm(deps);
			const accountId = await seedCapitalAccountForTests(pool);
			await fulfillSubmitPreconditions(pool, {
				organizationId: ORG_A,
				grantId: GRANT_ID,
				intentHash: INTENT_HASH,
				authorityEpoch: AUTHORITY_EPOCH,
				accountId,
			});

			const submitted = await submitIntent(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				intentHash: INTENT_HASH,
				instrumentId: INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
				executionMode: "SIMULATED",
			});
			expect(submitted.intentId).toMatch(/^dc_int_/);
		});
	});

	test("G5-DC-01: risk.check.completed cross-tenant event replay → DC_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			await proposeCheckArm(createDeps(pool));
			const consumer = createRiskCheckCompletedConsumer({
				unitOfWork: createDecisionsUnitOfWork(pool),
			});
			const eventId = randomUUID();
			const payload = {
				checkId: `rk_chk_${randomUUID()}`,
				organizationId: ORG_A,
				portfolioId: "00000000-0000-4000-8000-000000000040",
				intentHash: INTENT_HASH,
				checkResult: "PASS" as const,
				notionalAmount: "100.0",
				authorityEpoch: AUTHORITY_EPOCH,
				riskEpoch: 1,
				executionMode: "SIMULATED" as const,
			};
			await consumer.handle(payload, eventId);

			await expect(
				consumer.handle({ ...payload, organizationId: ORG_B }, eventId),
			).rejects.toMatchObject({ code: "DC_CROSS_TENANT" });
		});
	});

	test("risk consumer idempotent replay by eventId", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			await proposeCheckArm(createDeps(pool));
			const consumer = createRiskCheckCompletedConsumer({
				unitOfWork: createDecisionsUnitOfWork(pool),
			});
			const eventId = randomUUID();
			const payload = {
				checkId: `rk_chk_${randomUUID()}`,
				organizationId: ORG_A,
				portfolioId: "00000000-0000-4000-8000-000000000040",
				intentHash: INTENT_HASH,
				checkResult: "PASS" as const,
				notionalAmount: "100.0",
				authorityEpoch: AUTHORITY_EPOCH,
				riskEpoch: 1,
				executionMode: "SIMULATED" as const,
			};
			const first = await consumer.handle(payload, eventId);
			const replay = await consumer.handle(payload, eventId);
			expect(first.idempotentReplay).toBeUndefined();
			expect(replay.idempotentReplay).toBe(true);
		});
	});

	test("duplicate intent hash binding on second decision → DC_SUBMIT_PRECONDITION", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await proposeCheckArm(deps);
			const second = await proposeDecision(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				grantId: GRANT_ID,
				expectedAuthorityEpoch: AUTHORITY_EPOCH,
				correlationId: CORRELATION_ID,
			});
			await expect(
				checkAuthority(deps, {
					commandId: randomUUID(),
					organizationId: ORG_A,
					decisionId: second.decisionId!,
					grantId: GRANT_ID,
					authorityEpoch: AUTHORITY_EPOCH,
					intentHash: INTENT_HASH,
				}),
			).rejects.toMatchObject({ code: "DC_SUBMIT_PRECONDITION" });
		});
	});
});
