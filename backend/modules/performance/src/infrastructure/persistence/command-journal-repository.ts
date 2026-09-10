import type { Pool, PoolClient } from "pg";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";

export function createPgCommandJournalRepository(
	client: Pool | PoolClient,
): CommandJournalRepository {
	return {
		async findByCommandId(commandId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, journal_entry_id, response_snapshot
			 FROM performance_command_journal WHERE command_id = $1`,
				[commandId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				journalEntryId: row.journal_entry_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async findByJournalEntryId(journalEntryId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, journal_entry_id, response_snapshot
			 FROM performance_command_journal WHERE journal_entry_id = $1`,
				[journalEntryId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				journalEntryId: row.journal_entry_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async save(entry) {
			await client.query(
				`INSERT INTO performance_command_journal (command_id, organization_id, command_name, journal_entry_id, response_snapshot)
			 VALUES ($1,$2,$3,$4,$5)`,
				[
					entry.commandId,
					entry.organizationId,
					entry.commandName,
					entry.journalEntryId ?? null,
					entry.responseSnapshot,
				],
			);
		},
	};
}
