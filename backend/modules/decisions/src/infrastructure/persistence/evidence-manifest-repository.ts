import type { PoolClient } from "pg";
import type {
	EvidenceManifestEntryRecord,
	EvidenceManifestRecord,
	EvidenceManifestRepository,
} from "../../domain/ports/evidence-manifest";

function mapManifest(row: Record<string, unknown>): EvidenceManifestRecord {
	return {
		decisionId: String(row.decision_id),
		organizationId: String(row.organization_id),
		manifestId: String(row.manifest_id),
		manifestHash: String(row.manifest_hash),
		entryCount: Number(row.entry_count),
	};
}

function mapEntry(row: Record<string, unknown>): EvidenceManifestEntryRecord {
	return {
		id: String(row.id),
		decisionId: String(row.decision_id),
		organizationId: String(row.organization_id),
		evidenceId: String(row.evidence_id),
		claimTextHash: String(row.claim_text_hash),
		provenanceKind: String(row.provenance_kind),
		knowledgeEventId: row.knowledge_event_id
			? String(row.knowledge_event_id)
			: undefined,
	};
}

export function createPgEvidenceManifestRepository(
	client: PoolClient,
): EvidenceManifestRepository {
	return {
		async findByDecisionId(decisionId) {
			const result = await client.query(
				"SELECT * FROM decisions_evidence_manifests WHERE decision_id = $1",
				[decisionId],
			);
			const row = result.rows[0];
			return row ? mapManifest(row) : null;
		},
		async findEntryByKnowledgeEventId(knowledgeEventId) {
			const result = await client.query(
				`SELECT * FROM decisions_evidence_manifest_entries
				 WHERE knowledge_event_id = $1`,
				[knowledgeEventId],
			);
			const row = result.rows[0];
			return row ? mapEntry(row) : null;
		},
		async findEntriesByDecisionId(decisionId) {
			const result = await client.query(
				`SELECT * FROM decisions_evidence_manifest_entries
				 WHERE decision_id = $1
				 ORDER BY created_at ASC`,
				[decisionId],
			);
			return result.rows.map(mapEntry);
		},
		async appendEntry(input) {
			await client.query(
				`INSERT INTO decisions_evidence_manifest_entries (
				   id, decision_id, organization_id, evidence_id, claim_text_hash,
				   provenance_kind, knowledge_event_id
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					input.id,
					input.decisionId,
					input.organizationId,
					input.evidenceId,
					input.claimTextHash,
					input.provenanceKind,
					input.knowledgeEventId ?? null,
				],
			);
			const result = await client.query(
				"SELECT * FROM decisions_evidence_manifest_entries WHERE id = $1",
				[input.id],
			);
			return mapEntry(result.rows[0]);
		},
		async upsertManifest(input) {
			const result = await client.query(
				`INSERT INTO decisions_evidence_manifests (
				   decision_id, organization_id, manifest_id, manifest_hash, entry_count
				 ) VALUES ($1,$2,$3,$4,$5)
				 ON CONFLICT (decision_id) DO UPDATE SET
				   manifest_id = EXCLUDED.manifest_id,
				   manifest_hash = EXCLUDED.manifest_hash,
				   entry_count = EXCLUDED.entry_count,
				   updated_at = NOW()
				 RETURNING *`,
				[
					input.decisionId,
					input.organizationId,
					input.manifestId,
					input.manifestHash,
					input.entryCount,
				],
			);
			return mapManifest(result.rows[0]);
		},
	};
}
