import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createPgCommandJournalRepository,
	createDecisionsUnitOfWork,
	proposeDecision,
} from "@anxionos/decisions";
import {
	DECISIONS_TEST_CORRELATION_ID,
	DECISIONS_TEST_GRANT_ID,
	shouldRunPgIntegrationTests,
	withDecisionsPgHarness,
} from "../test-support";

const ORG_A = "00000000-0000-4000-8000-000000000001";
const ORG_B = "00000000-0000-4000-8000-000000000002";
const GRANT_ID = DECISIONS_TEST_GRANT_ID;
const CORRELATION_ID = DECISIONS_TEST_CORRELATION_ID;
const AUTHORITY_EPOCH = 1;

describe("decisions idempotency cross-tenant guard (ANX-149 G4)", () => {
	test("rejects cross-tenant commandId replay without metadata leak", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const unitOfWork = createDecisionsUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const commandId = randomUUID();

			const orgAResult = await proposeDecision(
				{ unitOfWork, commandJournal },
				{
					commandId,
					organizationId: ORG_A,
					grantId: GRANT_ID,
					expectedAuthorityEpoch: AUTHORITY_EPOCH,
					correlationId: CORRELATION_ID,
					proposalKind: "TRADE",
				},
			);

			await expect(
				proposeDecision(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: ORG_B,
						grantId: GRANT_ID,
						expectedAuthorityEpoch: AUTHORITY_EPOCH,
						correlationId: CORRELATION_ID,
						proposalKind: "TRADE",
					},
				),
			).rejects.toMatchObject({ code: "DC_CROSS_TENANT" });

			const orgBDecisions = await pool.query(
				`SELECT id FROM decisions_records WHERE organization_id = $1`,
				[ORG_B],
			);
			expect(orgBDecisions.rowCount).toBe(0);

			const journalRow = await pool.query(
				`SELECT organization_id, response_snapshot
				 FROM decisions_command_journal
				 WHERE command_id = $1`,
				[commandId],
			);
			expect(journalRow.rowCount).toBe(1);
			expect(journalRow.rows[0]?.organization_id).toBe(ORG_A);
			expect(journalRow.rows[0]?.response_snapshot).toMatchObject({
				decisionId: orgAResult.decisionId,
			});
		});
	});
});
