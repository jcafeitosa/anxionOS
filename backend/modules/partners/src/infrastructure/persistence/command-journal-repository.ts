import type { Pool, PoolClient } from "pg";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";

export function createPgCommandJournalRepository(
	client: Pool | PoolClient,
): CommandJournalRepository {
	return {
		async findByCommandId(commandId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, invoice_id, response_snapshot
			 FROM partners_command_journal WHERE command_id = $1`,
				[commandId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				invoiceId: row.invoice_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async findByInvoiceId(invoiceId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, invoice_id, response_snapshot
			 FROM partners_command_journal WHERE invoice_id = $1
			 ORDER BY created_at DESC LIMIT 1`,
				[invoiceId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				invoiceId: row.invoice_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async save(entry) {
			await client.query(
				`INSERT INTO partners_command_journal (
			   command_id, organization_id, command_name, invoice_id, response_snapshot
			 ) VALUES ($1,$2,$3,$4,$5)`,
				[
					entry.commandId,
					entry.organizationId,
					entry.commandName,
					entry.invoiceId ?? null,
					entry.responseSnapshot,
				],
			);
		},
	};
}
