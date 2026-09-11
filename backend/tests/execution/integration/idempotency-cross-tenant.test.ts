import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createExecutionUnitOfWork,
	createPgCommandJournalRepository,
	createPgRiskPermitValidationPort,
	openExecutionSession,
	openVenueReconciliationCase,
	SimulatedVenueAdapter,
} from "@anxionos/execution";
import {
	EXECUTION_TEST_AUTHORITY_EPOCH,
	EXECUTION_TEST_INTENT_HASH,
	EXECUTION_TEST_ORG_B,
	EXECUTION_TEST_ORG_ID,
	EXECUTION_TEST_RISK_EPOCH,
	seedRiskPermitForTests,
	shouldRunPgIntegrationTests,
	withExecutionPgHarness,
} from "../test-support";

describe("execution idempotency cross-tenant guard (ANX-151 G4)", () => {
	test("rejects cross-tenant commandId replay without metadata leak", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const unitOfWork = createExecutionUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const riskPermitValidation = createPgRiskPermitValidationPort(pool);
			const simulatedVenueAdapter = new SimulatedVenueAdapter();
			const riskPermitId = await seedRiskPermitForTests(pool);
			const commandId = randomUUID();

			const orgAResult = await openExecutionSession(
				{
					unitOfWork,
					commandJournal,
					riskPermitValidation,
					simulatedVenueAdapter,
				},
				{
					commandId,
					organizationId: EXECUTION_TEST_ORG_ID,
					intentHash: EXECUTION_TEST_INTENT_HASH,
					riskPermitId,
					authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
					riskEpoch: EXECUTION_TEST_RISK_EPOCH,
					executionMode: "SIMULATED",
				},
			);

			await expect(
				openExecutionSession(
					{
						unitOfWork,
						commandJournal,
						riskPermitValidation,
						simulatedVenueAdapter,
					},
					{
						commandId,
						organizationId: EXECUTION_TEST_ORG_B,
						intentHash: EXECUTION_TEST_INTENT_HASH,
						riskPermitId,
						authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
						riskEpoch: EXECUTION_TEST_RISK_EPOCH,
						executionMode: "SIMULATED",
					},
				),
			).rejects.toMatchObject({ code: "EX_CROSS_TENANT" });

			const orgBSessions = await pool.query(
				`SELECT id FROM execution_sessions WHERE organization_id = $1`,
				[EXECUTION_TEST_ORG_B],
			);
			expect(orgBSessions.rowCount).toBe(0);

			const journalRow = await pool.query(
				`SELECT organization_id, response_snapshot
				 FROM execution_command_journal
				 WHERE command_id = $1`,
				[commandId],
			);
			expect(journalRow.rowCount).toBe(1);
			expect(journalRow.rows[0]?.organization_id).toBe(EXECUTION_TEST_ORG_ID);
			expect(journalRow.rows[0]?.response_snapshot).toMatchObject({
				sessionId: orgAResult.sessionId,
			});
		});
	});

	test("G4-EX-04: raced cross-tenant commandId replay → EX_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const unitOfWork = createExecutionUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const commandId = randomUUID();

			const venueAdapterRefId = `ex_vad_${randomUUID()}`;
			const results = await Promise.allSettled([
				openVenueReconciliationCase(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: EXECUTION_TEST_ORG_ID,
						caseKind: "FILL_MISSING",
						venueAdapterRefId,
						evidence: "race-test-org-a",
					},
				),
				openVenueReconciliationCase(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: EXECUTION_TEST_ORG_B,
						caseKind: "FILL_MISSING",
						venueAdapterRefId,
						evidence: "race-test-org-b",
					},
				),
			]);

			const fulfilled = results.filter((r) => r.status === "fulfilled");
			const rejected = results.filter((r) => r.status === "rejected");
			expect(fulfilled).toHaveLength(1);
			expect(rejected).toHaveLength(1);
			const rejection = (rejected[0] as PromiseRejectedResult).reason as {
				code?: string;
			};
			expect(
				rejection?.code === "EX_CROSS_TENANT" || rejection?.code === "23505",
			).toBe(true);

			const orgBCases = await pool.query(
				`SELECT id FROM execution_reconciliation_cases WHERE organization_id = $1`,
				[EXECUTION_TEST_ORG_B],
			);
			expect(orgBCases.rowCount).toBe(0);
		});
	});
});
