import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
	NewCommandJournalRecord,
} from "../../domain/ports/command-journal";
import { CommandJournalConflictError } from "../../domain/ports/command-journal";
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
			// Insercao atomica: a colisao da PK composta nao pode devolver a linha
			// alheia, pois o agregado desta transacao ja pode ter sido mutado.
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
				.onConflictDoNothing({
					target: [commandJournal.tenantId, commandJournal.commandId],
				})
				.returning();
			const row = rows[0];
			if (!row) {
				throw new CommandJournalConflictError(entry.commandId);
			}
			return toCommandJournalRecord(row);
		},
	};
}
