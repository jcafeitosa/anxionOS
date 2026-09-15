import type { Pool, PoolClient } from "pg";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";

export function createPgCommandJournalRepository(
	client: Pool | PoolClient,
): CommandJournalRepository {
	return {
		async findByCommandId(organizationId, commandId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, request_hash, invoice_id, response_snapshot
				 FROM partners_command_journal WHERE organization_id = $1 AND command_id = $2`,
				[organizationId, commandId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				requestHash: row.request_hash ?? null,
				invoiceId: row.invoice_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async findByInvoiceId(organizationId, invoiceId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, request_hash, invoice_id, response_snapshot
				 FROM partners_command_journal WHERE organization_id = $1 AND invoice_id = $2
				 ORDER BY created_at DESC LIMIT 1`,
				[organizationId, invoiceId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				requestHash: row.request_hash ?? null,
				invoiceId: row.invoice_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async save(entry) {
			await client.query(
				`INSERT INTO partners_command_journal (
				   command_id, organization_id, command_name, request_hash, invoice_id, response_snapshot
				 ) VALUES ($1,$2,$3,$4,$5,$6)`,
				[
					entry.commandId,
					entry.organizationId,
					entry.commandName,
					entry.requestHash,
					entry.invoiceId ?? null,
					entry.responseSnapshot,
				],
			);
		},
	};
}
