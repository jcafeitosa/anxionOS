import type { Pool, PoolClient } from "pg";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";

export function createPgCommandJournalRepository(
	client: Pool | PoolClient,
): CommandJournalRepository {
	return {
		async findByCommandId(organizationId, commandId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, request_hash, usage_record_id, webhook_event_id, response_snapshot
				 FROM billing_command_journal WHERE organization_id = $1 AND command_id = $2`,
				[organizationId, commandId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				requestHash: row.request_hash ?? null,
				usageRecordId: row.usage_record_id ?? undefined,
				webhookEventId: row.webhook_event_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async findByUsageRecordId(organizationId, usageRecordId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, request_hash, usage_record_id, webhook_event_id, response_snapshot
				 FROM billing_command_journal WHERE organization_id = $1 AND usage_record_id = $2`,
				[organizationId, usageRecordId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				requestHash: row.request_hash ?? null,
				usageRecordId: row.usage_record_id ?? undefined,
				webhookEventId: row.webhook_event_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async findByWebhookEventId(organizationId, webhookEventId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, request_hash, usage_record_id, webhook_event_id, response_snapshot
				 FROM billing_command_journal WHERE organization_id = $1 AND webhook_event_id = $2`,
				[organizationId, webhookEventId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				requestHash: row.request_hash ?? null,
				usageRecordId: row.usage_record_id ?? undefined,
				webhookEventId: row.webhook_event_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async save(entry) {
			await client.query(
				`INSERT INTO billing_command_journal (command_id, organization_id, command_name, request_hash, usage_record_id, webhook_event_id, response_snapshot)
				 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					entry.commandId,
					entry.organizationId,
					entry.commandName,
					entry.requestHash,
					entry.usageRecordId ?? null,
					entry.webhookEventId ?? null,
					entry.responseSnapshot,
				],
			);
		},
	};
}
