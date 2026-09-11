import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { RISK_EVENT_TYPES } from "@anxionos/contracts/risk";
import {
	activateLimitPolicy,
	createPgCommandJournalRepository,
	createRiskUnitOfWork,
	runPreTradeCheck,
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

describe("risk lifecycle commands (ANX-150 S2)", () => {
	test("G3-RK-S2-01: check PASS emits permit and risk.check.completed.v1", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool);

			const result = await runPreTradeCheck(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_ID,
				intentHash: RISK_TEST_INTENT_HASH,
				notionalAmount: "100.0",
				authorityEpoch: 1,
				riskEpoch: RISK_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			expect(result.checkResult).toBe("PASS");
			expect(result.checkId).toMatch(/^rk_chk_/);
			expect(result.permitId).toMatch(/^rk_pmt_/);

			const journalRows = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'risk'
				 ORDER BY occurred_at`,
			);
			expect(journalRows.rowCount).toBe(2);
			expect(journalRows.rows[0]?.event_type).toBe(
				RISK_EVENT_TYPES.CHECK_COMPLETED,
			);
			expect(journalRows.rows[0]?.payload).toMatchObject({
				checkResult: "PASS",
				intentHash: RISK_TEST_INTENT_HASH,
			});
			expect(journalRows.rows[1]?.event_type).toBe(
				RISK_EVENT_TYPES.PERMIT_ISSUED,
			);

			const permitRows = await pool.query(
				`SELECT status FROM risk_permits WHERE id = $1`,
				[result.permitId],
			);
			expect(permitRows.rows[0]?.status).toBe("ISSUED");
		});
	});

	test("G3-RK-S2-02: CONFIG_REQUIRED deny when no active policy", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await pool.query(
				`INSERT INTO risk_epoch_registry (organization_id, current_risk_epoch)
				 VALUES ($1, $2)`,
				[RISK_TEST_ORG_ID, RISK_TEST_RISK_EPOCH],
			);

			const result = await runPreTradeCheck(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_ID,
				intentHash: RISK_TEST_INTENT_HASH,
				notionalAmount: "100.0",
				authorityEpoch: 1,
				riskEpoch: RISK_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			expect(result.checkResult).toBe("DENY");
			expect(result.denyReasonCode).toBe("RK_CONFIG_REQUIRED");
			expect(result.permitId).toBeUndefined();

			const permitCount = await pool.query(
				`SELECT count(*)::int AS c FROM risk_permits`,
			);
			expect(permitCount.rows[0]?.c).toBe(0);
		});
	});

	test("G3-RK-S2-03: cross-tenant commandId replay rejected", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const commandId = randomUUID();

			await activateLimitPolicy(deps, {
				commandId,
				organizationId: RISK_TEST_ORG_ID,
				policyVersion: "org-a",
				maxNotional: "1000.0",
				riskEpoch: RISK_TEST_RISK_EPOCH,
			});

			await expect(
				activateLimitPolicy(deps, {
					commandId,
					organizationId: RISK_TEST_ORG_B,
					policyVersion: "org-b",
					maxNotional: "1000.0",
					riskEpoch: RISK_TEST_RISK_EPOCH,
				}),
			).rejects.toMatchObject({ code: "RK_CROSS_TENANT" });

			const orgBPolicies = await pool.query(
				`SELECT id FROM risk_limit_policies WHERE organization_id = $1`,
				[RISK_TEST_ORG_B],
			);
			expect(orgBPolicies.rowCount).toBe(0);
		});
	});

	test("G3-RK-S2-04: stale epoch reject", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool, { riskEpoch: RISK_TEST_RISK_EPOCH });

			await expect(
				runPreTradeCheck(deps, {
					commandId: randomUUID(),
					organizationId: RISK_TEST_ORG_ID,
					portfolioId: RISK_TEST_PORTFOLIO_ID,
					intentHash: RISK_TEST_INTENT_HASH,
					notionalAmount: "100.0",
					authorityEpoch: 1,
					riskEpoch: RISK_TEST_RISK_EPOCH + 1,
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "RK_PERMIT_STALE" });
		});
	});

	test("G3-RK-S2-05: limit exceeded deny", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool, { maxNotional: "50.0" });

			const result = await runPreTradeCheck(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_ID,
				intentHash: RISK_TEST_INTENT_HASH,
				notionalAmount: "100.0",
				authorityEpoch: 1,
				riskEpoch: RISK_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			expect(result.checkResult).toBe("DENY");
			expect(result.denyReasonCode).toBe("RK_LIMIT_EXCEEDED");
			expect(result.permitId).toBeUndefined();
		});
	});

	test("idempotent replay by commandId returns same result", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool);
			const commandId = randomUUID();

			const first = await runPreTradeCheck(deps, {
				commandId,
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_ID,
				intentHash: RISK_TEST_INTENT_HASH,
				notionalAmount: "10.0",
				authorityEpoch: 1,
				riskEpoch: RISK_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const replay = await runPreTradeCheck(deps, {
				commandId,
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_ID,
				intentHash: RISK_TEST_INTENT_HASH,
				notionalAmount: "10.0",
				authorityEpoch: 1,
				riskEpoch: RISK_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			expect(replay.idempotentReplay).toBe(true);
			expect(replay.checkId).toBe(first.checkId);
			expect(replay.permitId).toBe(first.permitId);

			const checkCount = await pool.query(
				`SELECT count(*)::int AS c FROM risk_check_results`,
			);
			expect(checkCount.rows[0]?.c).toBe(1);
		});
	});
});
