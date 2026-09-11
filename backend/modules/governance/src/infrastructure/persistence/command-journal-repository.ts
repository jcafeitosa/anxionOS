import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
	CommandJournalConflictError,
	type CommandJournalRecord,
	type CommandJournalRepository,
	type NewCommandJournalRecord,
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
	db: NodePgDatabase<{ commandJournal: typeof commandJournal }>,
): CommandJournalRepository {
	return {
		async findByCommandId(commandId: string) {
			const rows = await db
				.select()
				.from(commandJournal)
				.where(eq(commandJournal.commandId, commandId))
				.limit(1);
			return rows[0] ? toCommandJournalRecord(rows[0]) : null;
		},
		async record(entry: NewCommandJournalRecord) {
			// ANX-476/ANX-475 (FURO 1): INSERCAO atomica. Nao ha find-then-insert:
			// se o `command_id` ja' existe, `ON CONFLICT DO NOTHING` nao devolve
			// linha e o conflito e' sinalizado — a transacao do perdedor faz
			// ROLLBACK em vez de commitar o agregado duplicado. Devolver a linha
			// alheia aqui era exatamente o double-apply.
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
