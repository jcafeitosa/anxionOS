-- strategies module baseline schema (ANX-147 slice S1).
-- Tables align with existing repository SQL in persistence/repositories.ts.
-- Forward tables (backtest_runs, deployments, signals) are schema-only until S3-S5.

DO $$ BEGIN
	CREATE TYPE strategy_version_lifecycle AS ENUM (
		'DRAFT',
		'BACKTESTED',
		'EVALUATED',
		'CERTIFIED',
		'PAPER',
		'SUSPENDED',
		'RETIRED'
	);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE strategies_execution_mode AS ENUM ('SIMULATED', 'PAPER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS strategies (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	display_name TEXT NOT NULL,
	description TEXT,
	execution_mode strategies_execution_mode NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS strategies_organization_id_idx
	ON strategies (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS strategies_org_display_active_uidx
	ON strategies (organization_id, display_name)
	WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS strategy_versions (
	id TEXT PRIMARY KEY,
	strategy_id TEXT NOT NULL REFERENCES strategies (id),
	organization_id UUID NOT NULL,
	version_number INTEGER NOT NULL,
	source_hash TEXT NOT NULL,
	rules_hash TEXT NOT NULL,
	parameters_hash TEXT NOT NULL,
	lifecycle_state strategy_version_lifecycle NOT NULL DEFAULT 'DRAFT',
	execution_mode strategies_execution_mode NOT NULL,
	revision INTEGER NOT NULL DEFAULT 1,
	published_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS strategy_versions_strategy_version_uidx
	ON strategy_versions (strategy_id, version_number);

CREATE INDEX IF NOT EXISTS strategy_versions_organization_id_idx
	ON strategy_versions (organization_id);

CREATE OR REPLACE FUNCTION strategies_block_published_version_mutation()
RETURNS TRIGGER AS $$
BEGIN
	IF OLD.lifecycle_state <> 'DRAFT' AND (
		NEW.source_hash IS DISTINCT FROM OLD.source_hash
		OR NEW.rules_hash IS DISTINCT FROM OLD.rules_hash
		OR NEW.parameters_hash IS DISTINCT FROM OLD.parameters_hash
		OR NEW.version_number IS DISTINCT FROM OLD.version_number
	) THEN
		RAISE EXCEPTION 'ST_VERSION_IMMUTABLE';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS strategy_versions_immutable_after_publish ON strategy_versions;

CREATE TRIGGER strategy_versions_immutable_after_publish
	BEFORE UPDATE ON strategy_versions
	FOR EACH ROW
	EXECUTE FUNCTION strategies_block_published_version_mutation();

CREATE TABLE IF NOT EXISTS strategies_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS strategies_command_journal_organization_id_idx
	ON strategies_command_journal (organization_id);

CREATE TABLE IF NOT EXISTS strategies_backtest_runs (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	strategy_id TEXT NOT NULL REFERENCES strategies (id),
	strategy_version_id TEXT NOT NULL REFERENCES strategy_versions (id),
	dataset_id TEXT NOT NULL,
	dataset_revision TEXT NOT NULL,
	seed TEXT NOT NULL,
	status TEXT NOT NULL CHECK (
		status IN ('REQUESTED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')
	),
	result_ref TEXT,
	metrics_hash TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS strategies_backtest_runs_version_idx
	ON strategies_backtest_runs (strategy_version_id);

CREATE TABLE IF NOT EXISTS strategies_deployments (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	strategy_id TEXT NOT NULL REFERENCES strategies (id),
	strategy_version_id TEXT NOT NULL REFERENCES strategy_versions (id),
	execution_mode strategies_execution_mode NOT NULL,
	portfolio_id TEXT,
	binding_snapshot JSONB NOT NULL,
	status TEXT NOT NULL CHECK (
		status IN ('ACTIVE', 'PAUSED', 'ROLLED_BACK', 'RETIRED')
	),
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS strategies_deployments_strategy_idx
	ON strategies_deployments (strategy_id);

CREATE TABLE IF NOT EXISTS strategies_signals (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	strategy_id TEXT NOT NULL REFERENCES strategies (id),
	deployment_id TEXT REFERENCES strategies_deployments (id),
	instrument_refs JSONB NOT NULL,
	value_ref TEXT NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	emitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	revision INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS strategies_signals_expires_at_idx
	ON strategies_signals (expires_at);
