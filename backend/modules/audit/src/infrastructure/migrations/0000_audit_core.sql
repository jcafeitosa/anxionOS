-- audit module baseline schema
-- Derived strictly from the repository contract:
--   modules/audit/src/infrastructure/persistence/{repositories,command-journal-repository}.ts
-- (unqualified table names live in `public`, matching the repo convention).

CREATE TABLE IF NOT EXISTS audit_manifests (
	id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	source_event_id UUID NOT NULL,
	owner_domain TEXT NOT NULL,
	event_type TEXT NOT NULL,
	occurred_at TIMESTAMPTZ NOT NULL,
	payload_hash TEXT NOT NULL,
	recorded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_manifests_source_event_id_idx
 ON audit_manifests (source_event_id);
CREATE INDEX IF NOT EXISTS audit_manifests_organization_id_idx
 ON audit_manifests (organization_id);

CREATE TABLE IF NOT EXISTS audit_flight_recorder_entries (
	id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	manifest_id UUID NOT NULL REFERENCES audit_manifests (id),
	source_event_id UUID NOT NULL,
	owner_domain TEXT NOT NULL,
	event_type TEXT NOT NULL,
	occurred_at TIMESTAMPTZ NOT NULL,
	payload_hash TEXT NOT NULL,
	recorded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_flight_recorder_entries_manifest_id_idx
 ON audit_flight_recorder_entries (manifest_id);
CREATE INDEX IF NOT EXISTS audit_flight_recorder_entries_organization_id_idx
 ON audit_flight_recorder_entries (organization_id);

CREATE TABLE IF NOT EXISTS audit_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	source_event_id UUID,
	response_snapshot JSONB
);

CREATE INDEX IF NOT EXISTS audit_command_journal_organization_id_idx
 ON audit_command_journal (organization_id);
CREATE INDEX IF NOT EXISTS audit_command_journal_source_event_id_idx
 ON audit_command_journal (source_event_id);