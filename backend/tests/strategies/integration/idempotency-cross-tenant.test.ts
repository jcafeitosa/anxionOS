import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createPgCommandJournalRepository,
	createStrategiesUnitOfWork,
	registerStrategy,
} from "@anxionos/strategies";
import {
	shouldRunPgIntegrationTests,
	withStrategiesPgHarness,
} from "../test-support";

const ORG_A = "00000000-0000-4000-8000-000000000001";
const ORG_B = "00000000-0000-4000-8000-000000000002";

describe("strategies idempotency cross-tenant guard (ANX-147 G4)", () => {
	test("rejects cross-tenant commandId replay without metadata leak", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withStrategiesPgHarness(async ({ pool }) => {
			const unitOfWork = createStrategiesUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const commandId = randomUUID();

			const orgAResult = await registerStrategy(
				{ unitOfWork, commandJournal },
				{
					commandId,
					organizationId: ORG_A,
					displayName: "Org A Strategy",
					executionMode: "SIMULATED",
				},
			);

			await expect(
				registerStrategy(
					{ unitOfWork, commandJournal },
					{
						commandId,
						organizationId: ORG_B,
						displayName: "Org B Strategy",
						executionMode: "SIMULATED",
					},
				),
			).rejects.toMatchObject({ code: "ST_CROSS_TENANT" });

			const orgBStrategies = await pool.query(
				`SELECT id FROM strategies WHERE organization_id = $1`,
				[ORG_B],
			);
			expect(orgBStrategies.rowCount).toBe(0);

			const journalRow = await pool.query(
				`SELECT organization_id, response_snapshot
				 FROM strategies_command_journal
				 WHERE command_id = $1`,
				[commandId],
			);
			expect(journalRow.rowCount).toBe(1);
			expect(journalRow.rows[0]?.organization_id).toBe(ORG_A);
			expect(journalRow.rows[0]?.response_snapshot).toMatchObject({
				strategyId: orgAResult.strategyId,
			});
		});
	});
});
