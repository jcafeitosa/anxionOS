import type { PoolClient } from "pg";

export async function insertDlqEntry(client, input) {
    const result = await client.query(`INSERT INTO graph_projection_dlq (
		   event_id, consumer_name, owner_domain, error_code,
		   attempt_count, payload_ref, replay_status, audit_manifest_id
		 ) VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
		 RETURNING dlq_id`, [
        input.eventId,
        input.consumerName,
        input.ownerDomain,
        input.errorCode,
        input.attemptCount,
        input.payloadRef,
        input.auditManifestId ?? null,
    ]);
    const dlqId = result.rows[0]?.dlq_id;
    if (!dlqId) {
        throw new Error("DLQ insert did not return dlq_id");
    }
    return String(dlqId);
}
export function buildRedactedPayloadRef(eventId: string, consumerName: string): string {
    return `flight-recorder://graph/${consumerName}/${eventId}?redacted=1`;
}

export interface InsertDlqInput {
    eventId: string;
    consumerName: string;
    ownerDomain: string;
    errorCode: string;
    attemptCount: number;
    payloadRef: string;
    auditManifestId?: string | null;
}
