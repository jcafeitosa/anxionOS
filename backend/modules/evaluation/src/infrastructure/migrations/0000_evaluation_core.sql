-- evaluation module baseline schema (ANX-160 S2).
-- Tables align with repository SQL in persistence/repositories.ts.

CREATE TABLE IF NOT EXISTS evaluation_records (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	outcome_snapshot_id TEXT NOT NULL,
	value_date TEXT NOT NULL,
	computed_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS evaluation_records_outcome_snapshot_uidx
	ON evaluation_records (outcome_snapshot_id);

CREATE INDEX IF NOT EXISTS evaluation_records_organization_id_idx
	ON evaluation_records (organization_id);

CREATE TABLE IF NOT EXISTS evaluation_scores (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	evaluation_record_id TEXT NOT NULL REFERENCES evaluation_records (id),
	score_metric TEXT NOT NULL,
	score_value TEXT NOT NULL,
	computed_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS evaluation_scores_record_uidx
	ON evaluation_scores (evaluation_record_id);

CREATE INDEX IF NOT EXISTS evaluation_scores_organization_id_idx
	ON evaluation_scores (organization_id);

CREATE TABLE IF NOT EXISTS evaluation_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	outcome_snapshot_id TEXT,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS evaluation_command_journal_outcome_snapshot_uidx
	ON evaluation_command_journal (outcome_snapshot_id)
	WHERE outcome_snapshot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS evaluation_command_journal_organization_id_idx
	ON evaluation_command_journal (organization_id);
