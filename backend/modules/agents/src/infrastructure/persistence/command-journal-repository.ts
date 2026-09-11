import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
	NewCommandJournalRecord,
} from "../../domain/ports/command-journal";
import { type CommandJournalRow, commandJournal } from "./schema";

export function toCommandJournalRecord(
	row: CommandJournalRow,
): CommandJournalRecord {
	return {
		tenantId: row.tenantId,
		commandId: row.commandId,
		commandName: row.commandName,
		aggregateId: row.aggregateId,
		aggregateType: row.aggregateType,
		revision: row.revision,
		responseSnapshot: row.responseSnapshot as Record<string, unknown> | null,
		createdAt: row.createdAt,
	};
}

export function createDrizzleCommandJournalRepository(
	db: NodePgDatabase<{ commandJournal: typeof commandJournal }>,
): CommandJournalRepository {
	return {
		async findByCommandId(tenantId: string, commandId: string) {
			const rows = await db
				.select()
				.from(commandJournal)
				.where(
					and(
						eq(commandJournal.tenantId, tenantId),
						eq(commandJournal.commandId, commandId),
					),
				)
				.limit(1);
			return rows[0] ? toCommandJournalRecord(rows[0]) : null;
		},
		async record(entry: NewCommandJournalRecord) {
			const existing = await this.findByCommandId(
				entry.tenantId,
				entry.commandId,
			);
			if (existing) {
				return existing;
			}
			const rows = await db
				.insert(commandJournal)
				.values({
					tenantId: entry.tenantId,
					commandId: entry.commandId,
					commandName: entry.commandName,
					aggregateId: entry.aggregateId,
					aggregateType: entry.aggregateType,
					revision: entry.revision,
					responseSnapshot: entry.responseSnapshot,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to record command journal entry");
			return toCommandJournalRecord(row);
		},
	};
}
