import type { Pool, PoolClient } from "pg";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";

export function createPgCommandJournalRepository(
	client: Pool | PoolClient,
): CommandJournalRepository {
	return {
		async findByCommandId(commandId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, journal_entry_id,
				        position_id, position_revision, response_snapshot
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
				positionId: row.position_id ?? undefined,
				positionRevision: row.position_revision ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async findByJournalEntryId(journalEntryId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, journal_entry_id,
				        position_id, position_revision, response_snapshot
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
				positionId: row.position_id ?? undefined,
				positionRevision: row.position_revision ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async findByPositionRevision(positionId, revision) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, journal_entry_id,
				        position_id, position_revision, response_snapshot
			 FROM performance_command_journal
			 WHERE position_id = $1 AND position_revision = $2`,
				[positionId, revision],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				journalEntryId: row.journal_entry_id ?? undefined,
				positionId: row.position_id ?? undefined,
				positionRevision: row.position_revision ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async save(entry) {
			await client.query(
				`INSERT INTO performance_command_journal (
				   command_id, organization_id, command_name, journal_entry_id,
				   position_id, position_revision, response_snapshot
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					entry.commandId,
					entry.organizationId,
					entry.commandName,
					entry.journalEntryId ?? null,
					entry.positionId ?? null,
					entry.positionRevision ?? null,
					entry.responseSnapshot,
				],
			);
		},
	};
}
