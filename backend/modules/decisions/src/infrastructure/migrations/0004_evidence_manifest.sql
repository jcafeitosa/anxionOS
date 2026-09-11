-- ANX-149 S5: EvidenceManifest refs + knowledge.evidence.recorded.v1 idempotency.

CREATE TABLE IF NOT EXISTS decisions_evidence_manifests (
	decision_id TEXT PRIMARY KEY REFERENCES decisions_records (id),
	organization_id UUID NOT NULL,
	manifest_id TEXT NOT NULL,
	manifest_hash TEXT NOT NULL,
	entry_count INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS decisions_evidence_manifests_organization_id_idx
	ON decisions_evidence_manifests (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS decisions_evidence_manifests_manifest_id_uidx
	ON decisions_evidence_manifests (manifest_id);

CREATE TABLE IF NOT EXISTS decisions_evidence_manifest_entries (
	id TEXT PRIMARY KEY,
	decision_id TEXT NOT NULL REFERENCES decisions_records (id),
	organization_id UUID NOT NULL,
	evidence_id TEXT NOT NULL,
	claim_text_hash TEXT NOT NULL,
	provenance_kind TEXT NOT NULL CHECK (
		provenance_kind IN ('DOCUMENT', 'RETRIEVAL', 'MANUAL', 'RUN_ARTIFACT')
	),
	knowledge_event_id UUID,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS decisions_evidence_manifest_entries_evidence_uidx
	ON decisions_evidence_manifest_entries (decision_id, evidence_id);

CREATE UNIQUE INDEX IF NOT EXISTS decisions_evidence_manifest_entries_knowledge_event_uidx
	ON decisions_evidence_manifest_entries (knowledge_event_id)
	WHERE knowledge_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS decisions_evidence_manifest_entries_organization_id_idx
	ON decisions_evidence_manifest_entries (organization_id);
