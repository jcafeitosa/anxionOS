import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { RISK_EVENT_TYPES } from "@anxionos/contracts/risk";
import {
	activateKillSwitch,
	createPgCommandJournalRepository,
	createRiskUnitOfWork,
	releaseKillSwitch,
	runPreTradeCheck,
} from "@anxionos/risk";
import {
	RISK_TEST_INTENT_HASH,
	RISK_TEST_ORG_B,
	RISK_TEST_ORG_ID,
	RISK_TEST_PORTFOLIO_B_ID,
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

describe("risk kill switch lifecycle (ANX-150 S3)", () => {
	test("G3-RK-S3-01: activateKillSwitch bumps epoch and emits events", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool);

			const result = await activateKillSwitch(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				reason: "incident containment",
				activatedBy: "operator@test",
				scope: "ORGANIZATION",
			});

			expect(result.killSwitchId).toMatch(/^rk_ksw_/);
			expect(result.riskEpoch).toBe(RISK_TEST_RISK_EPOCH + 1);
			expect(result.killSwitchActive).toBe(true);

			const epochRow = await pool.query(
				`SELECT current_risk_epoch FROM risk_epoch_registry WHERE organization_id = $1`,
				[RISK_TEST_ORG_ID],
			);
			expect(epochRow.rows[0]?.current_risk_epoch).toBe(
				RISK_TEST_RISK_EPOCH + 1,
			);

			const journalRows = await pool.query(
				`SELECT event_type FROM domain_journal WHERE owner_domain = 'risk' ORDER BY occurred_at`,
			);
			expect(journalRows.rows.map((row) => row.event_type)).toEqual([
				RISK_EVENT_TYPES.EPOCH_BUMPED,
				RISK_EVENT_TYPES.KILL_SWITCH_ACTIVATED,
			]);
		});
	});

	test("G3-RK-S3-02: runPreTradeCheck DENY RK_KILL_SWITCH_ACTIVE when active", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool);
			const activated = await activateKillSwitch(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				reason: "halt trading",
				activatedBy: "operator@test",
				scope: "ORGANIZATION",
			});

			const result = await runPreTradeCheck(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_ID,
				intentHash: RISK_TEST_INTENT_HASH,
				notionalAmount: "10.0",
				authorityEpoch: 1,
				riskEpoch: activated.riskEpoch!,
				executionMode: "SIMULATED",
			});

			expect(result.checkResult).toBe("DENY");
			expect(result.denyReasonCode).toBe("RK_KILL_SWITCH_ACTIVE");
			expect(result.permitId).toBeUndefined();
		});
	});

	test("G3-RK-S3-03: stale epoch after kill switch activation", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool);

			await activateKillSwitch(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				reason: "epoch bump",
				activatedBy: "operator@test",
				scope: "ORGANIZATION",
			});

			await expect(
				runPreTradeCheck(deps, {
					commandId: randomUUID(),
					organizationId: RISK_TEST_ORG_ID,
					portfolioId: RISK_TEST_PORTFOLIO_ID,
					intentHash: RISK_TEST_INTENT_HASH,
					notionalAmount: "10.0",
					authorityEpoch: 1,
					riskEpoch: RISK_TEST_RISK_EPOCH,
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "RK_PERMIT_STALE" });
		});
	});

	test("G3-RK-S3-04: cross-tenant activateKillSwitch rejected", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const commandId = randomUUID();

			await activateKillSwitch(deps, {
				commandId,
				organizationId: RISK_TEST_ORG_ID,
				reason: "org-a halt",
				activatedBy: "operator@test",
				scope: "ORGANIZATION",
			});

			await expect(
				activateKillSwitch(deps, {
					commandId,
					organizationId: RISK_TEST_ORG_B,
					reason: "org-b halt",
					activatedBy: "operator@test",
					scope: "ORGANIZATION",
				}),
			).rejects.toMatchObject({ code: "RK_CROSS_TENANT" });

			const orgBRows = await pool.query(
				`SELECT id FROM risk_kill_switch_state WHERE organization_id = $1`,
				[RISK_TEST_ORG_B],
			);
			expect(orgBRows.rowCount).toBe(0);
		});
	});

	test("G3-RK-S3-05: releaseKillSwitch allows PASS again", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool, {
				riskEpoch: RISK_TEST_RISK_EPOCH + 1,
			});
			await pool.query(
				`UPDATE risk_epoch_registry SET current_risk_epoch = $2 WHERE organization_id = $1`,
				[RISK_TEST_ORG_ID, RISK_TEST_RISK_EPOCH + 1],
			);

			const activated = await activateKillSwitch(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				reason: "temporary halt",
				activatedBy: "operator@test",
				scope: "ORGANIZATION",
			});

			await releaseKillSwitch(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				releasedBy: "operator@test",
				scope: "ORGANIZATION",
			});

			const result = await runPreTradeCheck(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_ID,
				intentHash: "e".repeat(64),
				notionalAmount: "10.0",
				authorityEpoch: 1,
				riskEpoch: activated.riskEpoch!,
				executionMode: "SIMULATED",
			});

			expect(result.checkResult).toBe("PASS");
			expect(result.permitId).toMatch(/^rk_pmt_/);
		});
	});

	test("G5-RK-03: PORTFOLIO kill switch blocks target portfolio only", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			await seedActiveLimitPolicy(pool);

			const activated = await activateKillSwitch(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				reason: "portfolio halt",
				activatedBy: "operator@test",
				scope: "PORTFOLIO",
				portfolioId: RISK_TEST_PORTFOLIO_ID,
			});
			expect(activated.killSwitchActive).toBe(true);

			const blocked = await runPreTradeCheck(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_ID,
				intentHash: RISK_TEST_INTENT_HASH,
				notionalAmount: "10.0",
				authorityEpoch: 1,
				riskEpoch: activated.riskEpoch!,
				executionMode: "SIMULATED",
			});
			expect(blocked.checkResult).toBe("DENY");
			expect(blocked.denyReasonCode).toBe("RK_KILL_SWITCH_ACTIVE");

			const allowed = await runPreTradeCheck(deps, {
				commandId: randomUUID(),
				organizationId: RISK_TEST_ORG_ID,
				portfolioId: RISK_TEST_PORTFOLIO_B_ID,
				intentHash: "c".repeat(64),
				notionalAmount: "10.0",
				authorityEpoch: 1,
				riskEpoch: activated.riskEpoch!,
				executionMode: "SIMULATED",
			});
			expect(allowed.checkResult).toBe("PASS");
			expect(allowed.permitId).toMatch(/^rk_pmt_/);
		});
	});

	test("G3-RK-S3-06: idempotent replay by commandId", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const commandId = randomUUID();

			const first = await activateKillSwitch(deps, {
				commandId,
				organizationId: RISK_TEST_ORG_ID,
				reason: "halt",
				activatedBy: "operator@test",
				scope: "ORGANIZATION",
			});

			const replay = await activateKillSwitch(deps, {
				commandId,
				organizationId: RISK_TEST_ORG_ID,
				reason: "halt",
				activatedBy: "operator@test",
				scope: "ORGANIZATION",
			});

			expect(replay.idempotentReplay).toBe(true);
			expect(replay.killSwitchId).toBe(first.killSwitchId);

			const count = await pool.query(
				`SELECT count(*)::int AS c FROM risk_kill_switch_state WHERE organization_id = $1 AND active = TRUE`,
				[RISK_TEST_ORG_ID],
			);
			expect(count.rows[0]?.c).toBe(1);
		});
	});
});
