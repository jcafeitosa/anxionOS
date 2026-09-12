import { and, eq } from "drizzle-orm";
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
		tenantId: row.tenantId,
		commandName: row.commandName,
		aggregateId: row.aggregateId,
		aggregateType: row.aggregateType,
		revision: row.revision,
		responseSnapshot: row.responseSnapshot as Record<string, unknown> | null,
		requestHash: row.requestHash,
		createdAt: row.createdAt,
	};
}

export function createDrizzleCommandJournalRepository(
	db: NodePgDatabase<{ commandJournal: typeof commandJournal }>,
): CommandJournalRepository {
	return {
		async findByCommandId(commandId: string, tenantId: string) {
			const rows = await db
				.select()
				.from(commandJournal)
				.where(
					and(
						eq(commandJournal.commandId, commandId),
						eq(commandJournal.tenantId, tenantId),
					),
				)
				.limit(1);
			return rows[0] ? toCommandJournalRecord(rows[0]) : null;
		},
		async record(entry: NewCommandJournalRecord) {
			// Insercao atomica: nao ha find-then-insert. Se (tenant_id, command_id)
			// ja' existe, `ON CONFLICT DO NOTHING` nao devolve linha e o conflito e'
			// sinalizado — a transacao do perdedor faz ROLLBACK em vez de commitar o
			// agregado duplicado. Devolver a linha alheia aqui era o double-apply
			// (S2/ANX-460, mesmo desenho do governance em `command-support.ts`).
			//
			// Red Team (Davi): onConflict deve usar a PK composta (tenant_id, command_id),
			// nao apenas command_id, para garantir isolamento real por tenant.
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
					requestHash: entry.requestHash ?? null,
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
