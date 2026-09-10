import type { Pool, PoolClient } from "pg";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";

export function createPgCommandJournalRepository(
	client: Pool | PoolClient,
): CommandJournalRepository {
	return {
		async findByCommandId(commandId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, source_event_id, response_snapshot
			 FROM audit_command_journal WHERE command_id = $1`,
				[commandId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				sourceEventId: row.source_event_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async findBySourceEventId(sourceEventId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, source_event_id, response_snapshot
			 FROM audit_command_journal WHERE source_event_id = $1`,
				[sourceEventId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				sourceEventId: row.source_event_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async save(entry) {
			await client.query(
				`INSERT INTO audit_command_journal (command_id, organization_id, command_name, source_event_id, response_snapshot)
			 VALUES ($1,$2,$3,$4,$5)`,
				[
					entry.commandId,
					entry.organizationId,
					entry.commandName,
					entry.sourceEventId ?? null,
					entry.responseSnapshot,
				],
			);
		},
	};
}
