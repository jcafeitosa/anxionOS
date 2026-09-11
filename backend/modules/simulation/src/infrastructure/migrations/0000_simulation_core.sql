-- simulation module baseline schema (ANX-159 P08-S1).
-- PostgreSQL is authoritative run state; SQLite sandbox is deferred to P08-S3.

CREATE TABLE IF NOT EXISTS simulation_manifests (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	fidelity_tier TEXT NOT NULL DEFAULT 'TIER_SIMULATED',
	dataset_hash TEXT NOT NULL,
	sandbox_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
	manifest_payload JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simulation_manifests_organization_id_idx
	ON simulation_manifests (organization_id);

CREATE TABLE IF NOT EXISTS simulation_runs (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	manifest_id TEXT REFERENCES simulation_manifests (id),
	strategy_id TEXT,
	strategy_version_id TEXT,
	backtest_request_id TEXT,
	execution_mode TEXT NOT NULL DEFAULT 'SIMULATED',
	status TEXT NOT NULL,
	scenario_label TEXT,
	isolation_flags JSONB NOT NULL,
	seed_hash TEXT,
	result_ref TEXT,
	revision INTEGER NOT NULL DEFAULT 1,
	started_at TIMESTAMPTZ NOT NULL,
	completed_at TIMESTAMPTZ,
	failed_at TIMESTAMPTZ,
	failure_code TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simulation_runs_organization_id_idx
	ON simulation_runs (organization_id);

CREATE INDEX IF NOT EXISTS simulation_runs_backtest_request_id_idx
	ON simulation_runs (backtest_request_id)
	WHERE backtest_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS simulation_runs_org_backtest_uidx
	ON simulation_runs (organization_id, backtest_request_id)
	WHERE backtest_request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS simulation_snapshots (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	simulation_run_id TEXT NOT NULL REFERENCES simulation_runs (id),
	dataset_ref TEXT,
	dataset_hash TEXT NOT NULL,
	snapshot_payload JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simulation_snapshots_organization_id_idx
	ON simulation_snapshots (organization_id);

CREATE INDEX IF NOT EXISTS simulation_snapshots_run_id_idx
	ON simulation_snapshots (simulation_run_id);

CREATE TABLE IF NOT EXISTS simulation_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simulation_command_journal_organization_id_idx
	ON simulation_command_journal (organization_id);
