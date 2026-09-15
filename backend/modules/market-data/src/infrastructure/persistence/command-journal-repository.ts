import type { Pool, PoolClient } from "pg";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";

export function createPgCommandJournalRepository(
	client: Pool | PoolClient,
): CommandJournalRepository {
	return {
		async findByCommandId(organizationId, commandId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, request_hash, response_snapshot
				 FROM market_data_command_journal WHERE organization_id = $1 AND command_id = $2`,
				[organizationId, commandId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				requestHash: row.request_hash ? String(row.request_hash) : null,
				responseSnapshot: row.response_snapshot,
			};
		},
		async save(entry) {
			await client.query(
				`INSERT INTO market_data_command_journal (command_id, organization_id, command_name, request_hash, response_snapshot)
				 VALUES ($1,$2,$3,$4,$5)`,
				[
					entry.commandId,
					entry.organizationId,
					entry.commandName,
					entry.requestHash,
					entry.responseSnapshot,
				],
			);
		},
	};
}
