import type { Pool, PoolClient } from "pg";

export async function findDlqEntryById(queryable, dlqId) {
	const result = await queryable.query(
		`SELECT dlq_id, event_id, consumer_name, owner_domain, error_code,
		        attempt_count, payload_ref, replay_status, audit_manifest_id
		   FROM graph_projection_dlq
		  WHERE dlq_id = $1`,
		[dlqId],
	);
	const row = result.rows[0];
	if (!row) {
		return null;
	}
	return {
		dlqId: String(row.dlq_id),
		eventId: String(row.event_id),
		consumerName: String(row.consumer_name),
		ownerDomain: String(row.owner_domain),
		errorCode: String(row.error_code),
		attemptCount: Number(row.attempt_count),
		payloadRef: String(row.payload_ref),
		replayStatus: row.replay_status,
		auditManifestId: row.audit_manifest_id
			? String(row.audit_manifest_id)
			: null,
	};
}
export async function markDlqReplayed(client, dlqId, auditManifestId) {
	const result = await client.query(
		`UPDATE graph_projection_dlq
		    SET replay_status = 'replayed',
		        audit_manifest_id = COALESCE(audit_manifest_id, $2)
		  WHERE dlq_id = $1
		    AND replay_status = 'open'
		  RETURNING dlq_id`,
		[dlqId, auditManifestId],
	);
	return result.rowCount === 0 ? "already_replayed" : "replayed";
}
export async function resetInboxForReplay(client, eventId, consumerName) {
	await client.query(
		`UPDATE graph_projection_inbox
		    SET status = 'pending',
		        attempt_count = 0,
		        error_code = NULL,
		        processed_at = NULL
		  WHERE event_id = $1
		    AND consumer_name = $2`,
		[eventId, consumerName],
	);
}

export interface DlqEntry {
	dlqId: string;
	eventId: string;
	consumerName: string;
	ownerDomain: string;
	errorCode: string;
	attemptCount: number;
	payloadRef: string;
	replayStatus: "open" | "replayed" | "discarded";
	auditManifestId: string | null;
}
