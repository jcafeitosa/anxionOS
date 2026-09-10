import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
	CommandJournalHashMismatchError,
	assertCommandJournalReplay,
} from "../../application/command-support";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
} from "../../domain/ports/command-journal";
import { type CommandJournalRow, commandJournal } from "./schema";

export function toCommandJournalRecord(
	row: CommandJournalRow,
): CommandJournalRecord {
	return {
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
	db: NodePgDatabase<{
		commandJournal: typeof commandJournal;
	}>,
): CommandJournalRepository {
	return {
		async findByCommandId(commandId) {
			const rows = await db
				.select()
				.from(commandJournal)
				.where(eq(commandJournal.commandId, commandId))
				.limit(1);
			return rows[0] ? toCommandJournalRecord(rows[0]) : null;
		},
		async record(entry) {
			const existing = await this.findByCommandId(entry.commandId);
			if (existing) {
				const incomingHash = entry.responseSnapshot?.requestHash;
				if (typeof incomingHash === "string") {
					try {
						assertCommandJournalReplay(existing.responseSnapshot, incomingHash);
					} catch (error) {
						if (error instanceof CommandJournalHashMismatchError) {
							throw error;
						}
						throw error;
					}
				}
				return existing;
			}
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
			if (!row) throw new Error("Failed to record command journal entry");
			return toCommandJournalRecord(row);
		},
	};
}
