import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
	NewCommandJournalRecord,
} from "../../domain/ports/command-journal";
import type * as schema from "./schema";
import { type CommandJournalRow, commandJournal } from "./schema";

type IdentityDb = NodePgDatabase<typeof schema>;

function toRecord(row: CommandJournalRow): CommandJournalRecord {
	return {
		commandId: row.commandId,
		commandName: row.commandName,
		aggregateId: row.aggregateId,
		aggregateType: row.aggregateType,
		revision: row.revision,
		responseSnapshot:
			(row.responseSnapshot as Record<string, unknown> | null) ?? null,
		createdAt: row.createdAt,
	};
}

export function createDrizzleCommandJournalRepository(
	db: IdentityDb,
): CommandJournalRepository {
	return {
		async findByCommandId(
			commandId: string,
		): Promise<CommandJournalRecord | null> {
			const rows = await db
				.select()
				.from(commandJournal)
				.where(eq(commandJournal.commandId, commandId))
				.limit(1);
			return rows[0] ? toRecord(rows[0]) : null;
		},
		async record(
			entry: NewCommandJournalRecord,
		): Promise<CommandJournalRecord> {
			const rows = await db
				.insert(commandJournal)
				.values({
					commandId: entry.commandId,
					commandName: entry.commandName,
					aggregateId: entry.aggregateId,
					aggregateType: entry.aggregateType,
					revision: entry.revision,
					responseSnapshot: entry.responseSnapshot,
				})
				.returning();
			const row = rows[0];
			if (!row) {
				throw new Error("Failed to record command journal entry");
			}
			return toRecord(row);
		},
	};
}
