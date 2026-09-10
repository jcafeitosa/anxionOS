import type { Pool, PoolClient } from "pg";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";

export function createPgCommandJournalRepository(
	client: Pool | PoolClient,
): CommandJournalRepository {
	return {
		async findByCommandId(commandId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, usage_record_id, webhook_event_id, response_snapshot
			 FROM billing_command_journal WHERE command_id = $1`,
				[commandId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				usageRecordId: row.usage_record_id ?? undefined,
				webhookEventId: row.webhook_event_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async findByUsageRecordId(usageRecordId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, usage_record_id, webhook_event_id, response_snapshot
			 FROM billing_command_journal WHERE usage_record_id = $1`,
				[usageRecordId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				usageRecordId: row.usage_record_id ?? undefined,
				webhookEventId: row.webhook_event_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async findByWebhookEventId(webhookEventId) {
			const result = await client.query(
				`SELECT command_id, organization_id, command_name, usage_record_id, webhook_event_id, response_snapshot
			 FROM billing_command_journal WHERE webhook_event_id = $1`,
				[webhookEventId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				commandId: row.command_id,
				organizationId: row.organization_id,
				commandName: row.command_name,
				usageRecordId: row.usage_record_id ?? undefined,
				webhookEventId: row.webhook_event_id ?? undefined,
				responseSnapshot: row.response_snapshot,
			};
		},
		async save(entry) {
			await client.query(
				`INSERT INTO billing_command_journal (command_id, organization_id, command_name, usage_record_id, webhook_event_id, response_snapshot)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
				[
					entry.commandId,
					entry.organizationId,
					entry.commandName,
					entry.usageRecordId ?? null,
					entry.webhookEventId ?? null,
					entry.responseSnapshot,
				],
			);
		},
	};
}
