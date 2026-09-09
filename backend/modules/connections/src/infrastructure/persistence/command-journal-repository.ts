import type { PoolClient } from "pg";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
} from "../../domain/ports/command-journal";

export function createPgCommandJournalRepository(
	client: PoolClient,
): CommandJournalRepository {
	return {
		async findByCommandId(commandId: string) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, response_snapshot
				 FROM connections_command_journal WHERE command_id = $1`,
				[commandId],
			);
			const row = result.rows[0];
			if (!row) {
				return null;
			}
			return {
				commandId: String(row.command_id),
				organizationId: String(row.organization_id),
				commandName: String(row.command_name),
				responseSnapshot: row.response_snapshot as Record<string, unknown>,
			};
		},
		async save(record: CommandJournalRecord) {
			await client.query(
				`INSERT INTO connections_command_journal (command_id, organization_id, command_name, response_snapshot)
				 VALUES ($1, $2, $3, $4)`,
				[
					record.commandId,
					record.organizationId,
					record.commandName,
					record.responseSnapshot,
				],
			);
		},
	};
}
