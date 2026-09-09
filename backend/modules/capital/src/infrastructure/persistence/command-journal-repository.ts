import type { Pool, PoolClient } from "pg";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";

export function createPgCommandJournalRepository(client: Pool | PoolClient): CommandJournalRepository {
    return {
        async findByCommandId(commandId) {
            const result = await client.query(`SELECT command_id, organization_id, command_name, response_snapshot
				 FROM capital_command_journal WHERE command_id = $1`, [commandId]);
            const row = result.rows[0];
            if (!row)
                return null;
            return {
                commandId: row.command_id,
                organizationId: row.organization_id,
                commandName: row.command_name,
                responseSnapshot: row.response_snapshot,
            };
        },
        async save(entry) {
            await client.query(`INSERT INTO capital_command_journal (command_id, organization_id, command_name, response_snapshot)
				 VALUES ($1,$2,$3,$4)`, [entry.commandId, entry.organizationId, entry.commandName, entry.responseSnapshot]);
        },
    };
}
