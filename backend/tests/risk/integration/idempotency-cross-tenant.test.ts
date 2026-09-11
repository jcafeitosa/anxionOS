import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	activateLimitPolicy,
	createPgCommandJournalRepository,
	createRiskUnitOfWork,
} from "@anxionos/risk";
import {
	RISK_TEST_ORG_B,
	RISK_TEST_ORG_ID,
	RISK_TEST_RISK_EPOCH,
	shouldRunPgIntegrationTests,
	withRiskPgHarness,
} from "../test-support";

describe("risk idempotency cross-tenant guard (ANX-150 G4)", () => {
	test("rejects cross-tenant commandId replay without metadata leak", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const unitOfWork = createRiskUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const commandId = randomUUID();

			const orgAResult = await activateLimitPolicy(
				{ unitOfWork, commandJournal },
				{
					commandId,
					organizationId: RISK_TEST_ORG_ID,
					policyVersion: "test-policy-v1",
					maxNotional: "1000000.0",
					riskEpoch: RISK_TEST_RISK_EPOCH,
				},
			);

			await expect(
				activateLimitPolicy(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: RISK_TEST_ORG_B,
						policyVersion: "test-policy-v1",
						maxNotional: "1000000.0",
						riskEpoch: RISK_TEST_RISK_EPOCH,
					},
				),
			).rejects.toMatchObject({ code: "RK_CROSS_TENANT" });

			const orgBPolicies = await pool.query(
				`SELECT id FROM risk_limit_policies WHERE organization_id = $1`,
				[RISK_TEST_ORG_B],
			);
			expect(orgBPolicies.rowCount).toBe(0);

			const journalRow = await pool.query(
				`SELECT organization_id, response_snapshot
				 FROM risk_command_journal
				 WHERE command_id = $1`,
				[commandId],
			);
			expect(journalRow.rowCount).toBe(1);
			expect(journalRow.rows[0]?.organization_id).toBe(RISK_TEST_ORG_ID);
			expect(journalRow.rows[0]?.response_snapshot).toMatchObject({
				policyId: orgAResult.policyId,
			});
		});
	});

	test("G5-RK-04: raced cross-tenant commandId replay → RK_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const unitOfWork = createRiskUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const commandId = randomUUID();

			const results = await Promise.allSettled([
				activateLimitPolicy(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: RISK_TEST_ORG_ID,
						policyVersion: "test-policy-v1",
						maxNotional: "1000000.0",
						riskEpoch: RISK_TEST_RISK_EPOCH,
					},
				),
				activateLimitPolicy(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: RISK_TEST_ORG_B,
						policyVersion: "test-policy-v1",
						maxNotional: "1000000.0",
						riskEpoch: RISK_TEST_RISK_EPOCH,
					},
				),
			]);

			const fulfilled = results.filter((r) => r.status === "fulfilled");
			const rejected = results.filter((r) => r.status === "rejected");
			expect(fulfilled).toHaveLength(1);
			expect(rejected).toHaveLength(1);
			expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
				code: "RK_CROSS_TENANT",
			});

			const orgBPolicies = await pool.query(
				`SELECT id FROM risk_limit_policies WHERE organization_id = $1`,
				[RISK_TEST_ORG_B],
			);
			expect(orgBPolicies.rowCount).toBe(0);
		});
	});
});
