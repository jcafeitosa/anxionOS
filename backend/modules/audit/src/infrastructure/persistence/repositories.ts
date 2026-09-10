import type { PoolClient } from "pg";
import type {
	AuditFlightRecorderEntryRecord,
	AuditFlightRecorderRepository,
	AuditManifestRecord,
	AuditManifestRepository,
} from "../../domain/ports/audit-unit-of-work";

function mapManifest(row: Record<string, unknown>): AuditManifestRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		sourceEventId: String(row.source_event_id),
		ownerDomain: String(row.owner_domain),
		eventType: String(row.event_type),
		occurredAt: (row.occurred_at as Date).toISOString(),
		payloadHash: String(row.payload_hash),
		recordedAt: (row.recorded_at as Date).toISOString(),
	};
}
export function createPgAuditManifestRepository(
	client: PoolClient,
): AuditManifestRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM audit_manifests WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapManifest(row) : null;
		},
		async findBySourceEventId(sourceEventId) {
			const result = await client.query(
				"SELECT * FROM audit_manifests WHERE source_event_id = $1",
				[sourceEventId],
			);
			const row = result.rows[0];
			return row ? mapManifest(row) : null;
		},
		async save(record: AuditManifestRecord) {
			await client.query(
				`INSERT INTO audit_manifests (
			   id, organization_id, source_event_id, owner_domain, event_type, occurred_at, payload_hash, recorded_at
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[
					record.id,
					record.organizationId,
					record.sourceEventId,
					record.ownerDomain,
					record.eventType,
					record.occurredAt,
					record.payloadHash,
					record.recordedAt,
				],
			);
			return record;
		},
	};
}
export function createPgAuditFlightRecorderRepository(
	client: PoolClient,
): AuditFlightRecorderRepository {
	return {
		async save(record: AuditFlightRecorderEntryRecord) {
			await client.query(
				`INSERT INTO audit_flight_recorder_entries (
			   id, organization_id, manifest_id, source_event_id, owner_domain, event_type, occurred_at, payload_hash, recorded_at
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				[
					record.id,
					record.organizationId,
					record.manifestId,
					record.sourceEventId,
					record.ownerDomain,
					record.eventType,
					record.occurredAt,
					record.payloadHash,
					record.recordedAt,
				],
			);
			return record;
		},
	};
}
