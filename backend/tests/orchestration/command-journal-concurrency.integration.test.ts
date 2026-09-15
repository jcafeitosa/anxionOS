import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	createOrchestrationDb,
	ensureOrchestrationSchema,
	OrchestrationCommandJournalConflictError,
} from "@anxionos/orchestration";
import {
	getDatabaseUrl,
	shouldRunPgIntegrationTests,
} from "../pg-harness-guard";

describe("orchestration command journal concurrency (ANX-478)", () => {
	test("same commandId inserts one row and rejects the loser", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const databaseUrl = getDatabaseUrl();
		if (!databaseUrl) return;

		const pool = createPgPool(databaseUrl);
		try {
			await ensureOrchestrationSchema(pool);
			for (let round = 0; round < 5; round += 1) {
				const { unitOfWork } = createOrchestrationDb(pool);
				const commandId = randomUUID();
				const outcomes = await Promise.allSettled(
					[0, 1].map((index) =>
						unitOfWork.runInTransaction(async (context) =>
							context.commandJournal.record({
								commandId,
								commandName: "ConcurrentJournalProbe",
								aggregateId: randomUUID(),
								aggregateType: "Probe",
								revision: index + 1,
								responseSnapshot: { round, index },
							}),
						),
					),
				);
				const fulfilled = outcomes.filter(
					(outcome) => outcome.status === "fulfilled",
				);
				const rejected = outcomes.filter(
					(outcome) => outcome.status === "rejected",
				);
				expect(fulfilled).toHaveLength(1);
				expect(rejected).toHaveLength(1);
				if (rejected[0]?.status === "rejected") {
					expect(rejected[0].reason).toBeInstanceOf(
						OrchestrationCommandJournalConflictError,
					);
				}

				const rows = await pool.query(
					"SELECT count(*)::int AS count FROM orchestration_command_journal WHERE command_id = $1",
					[commandId],
				);
				expect(rows.rows[0]?.count).toBe(1);
				await pool.query(
					"DELETE FROM orchestration_command_journal WHERE command_id = $1",
					[commandId],
				);
			}
		} finally {
			await pool.end();
		}
	});
});
