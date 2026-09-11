-- risk module baseline schema (ANX-150 slice S1).
-- Tables align with repository SQL in persistence/repositories.ts.

DO $$ BEGIN
	CREATE TYPE risk_execution_mode AS ENUM ('SIMULATED', 'PAPER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS risk_epoch_registry (
	organization_id UUID PRIMARY KEY,
	current_risk_epoch INTEGER NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_limit_policies (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	policy_version TEXT NOT NULL,
	max_notional TEXT NOT NULL,
	max_leverage TEXT,
	risk_epoch INTEGER NOT NULL,
	status TEXT NOT NULL CHECK (
		status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'REVOKED')
	),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS risk_limit_policies_organization_id_idx
	ON risk_limit_policies (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS risk_limit_policies_org_active_uidx
	ON risk_limit_policies (organization_id)
	WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS risk_check_results (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	portfolio_id TEXT NOT NULL,
	intent_hash TEXT NOT NULL,
	notional_amount TEXT NOT NULL,
	authority_epoch INTEGER NOT NULL,
	risk_epoch INTEGER NOT NULL,
	execution_mode risk_execution_mode NOT NULL,
	check_result TEXT NOT NULL CHECK (check_result IN ('PASS', 'DENY', 'DEFER')),
	deny_reason_code TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS risk_check_results_organization_id_idx
	ON risk_check_results (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS risk_check_results_org_intent_hash_uidx
	ON risk_check_results (organization_id, intent_hash);

CREATE TABLE IF NOT EXISTS risk_permits (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	check_id TEXT NOT NULL REFERENCES risk_check_results (id),
	intent_hash TEXT NOT NULL,
	authority_epoch INTEGER NOT NULL,
	risk_epoch INTEGER NOT NULL,
	status TEXT NOT NULL CHECK (
		status IN ('ISSUED', 'CONSUMED', 'REVOKED', 'EXPIRED')
	),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS risk_permits_organization_id_idx
	ON risk_permits (organization_id);

CREATE INDEX IF NOT EXISTS risk_permits_check_id_idx
	ON risk_permits (check_id);

CREATE TABLE IF NOT EXISTS risk_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	intent_hash TEXT,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS risk_command_journal_organization_id_idx
	ON risk_command_journal (organization_id);

CREATE INDEX IF NOT EXISTS risk_command_journal_org_intent_hash_idx
	ON risk_command_journal (organization_id, intent_hash)
	WHERE intent_hash IS NOT NULL;
