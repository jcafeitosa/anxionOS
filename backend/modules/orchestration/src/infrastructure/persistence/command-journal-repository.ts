import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
} from "../../domain/ports/command-journal";
import { CommandJournalConflictError } from "../../domain/ports/command-journal";
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
			// Insercao atomica: uma colisao nao pode devolver a linha alheia depois
			// de a transacao atual ter aplicado o efeito do comando.
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
				.onConflictDoNothing({ target: commandJournal.commandId })
				.returning();
			const row = rows[0];
			if (!row) {
				throw new CommandJournalConflictError(entry.commandId);
			}
			return toCommandJournalRecord(row);
		},
	};
}
