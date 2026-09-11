import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createExecutionDb,
	listOrders,
	listReconciliationCases,
} from "@anxionos/execution";
import {
	activateKillSwitch,
	createPgCommandJournalRepository,
	createRiskDb,
	createRiskUnitOfWork,
	getKillSwitchStatus,
} from "@anxionos/risk";
import {
	EXECUTION_TEST_ORG_ID,
	seedActiveLimitPolicy,
	shouldRunPgIntegrationTests,
	withExecutionPgHarness,
} from "../execution/test-support";

describe("execution/risk HTTP query adapters (ANX-165)", () => {
	test("listOrders returns empty collection for org without open orders", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const db = createExecutionDb(pool);
			const result = await listOrders(
				{ orders: db.orders },
				EXECUTION_TEST_ORG_ID,
			);
			expect(result.orders).toEqual([]);
		});
	});

	test("listReconciliationCases returns empty collection initially", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const db = createExecutionDb(pool);
			const result = await listReconciliationCases(
				{ reconciliationCases: db.reconciliationCases },
				EXECUTION_TEST_ORG_ID,
			);
			expect(result.reconciliationCases).toEqual([]);
		});
	});

	test("getKillSwitchStatus reports inactive then active organization switch", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			await seedActiveLimitPolicy(pool);
			const riskDb = createRiskDb(pool);
			const inactive = await getKillSwitchStatus(
				{ killSwitch: riskDb.killSwitch },
				EXECUTION_TEST_ORG_ID,
			);
			expect(inactive.status.killSwitchActive).toBe(false);
			expect(inactive.status.scope).toBe("ORGANIZATION");

			await activateKillSwitch(
				{
					unitOfWork: createRiskUnitOfWork(pool),
					commandJournal: createPgCommandJournalRepository(pool),
				},
				{
					commandId: randomUUID(),
					organizationId: EXECUTION_TEST_ORG_ID,
					reason: "integration probe",
					activatedBy: "principal-test",
					scope: "ORGANIZATION",
				},
			);

			const active = await getKillSwitchStatus(
				{ killSwitch: riskDb.killSwitch },
				EXECUTION_TEST_ORG_ID,
			);
			expect(active.status.killSwitchActive).toBe(true);
			expect(active.status.killSwitchId).toMatch(/^rk_ksw_/);
		});
	});
});
