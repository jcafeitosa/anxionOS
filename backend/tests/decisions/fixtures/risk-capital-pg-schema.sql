-- Minimal risk + capital schema for decisions S4 PG integration tests.

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
	status TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_check_results (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	portfolio_id TEXT NOT NULL,
	intent_hash TEXT NOT NULL,
	notional_amount TEXT NOT NULL,
	authority_epoch INTEGER NOT NULL,
	risk_epoch INTEGER NOT NULL,
	execution_mode TEXT NOT NULL,
	check_result TEXT NOT NULL,
	deny_reason_code TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_permits (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	check_id TEXT NOT NULL,
	intent_hash TEXT NOT NULL,
	authority_epoch INTEGER NOT NULL,
	risk_epoch INTEGER NOT NULL,
	status TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	intent_hash TEXT,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capital_accounts (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	owner_user_id UUID NOT NULL,
	base_currency TEXT NOT NULL,
	execution_mode TEXT NOT NULL,
	status TEXT NOT NULL,
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capital_balance_lines (
	account_id TEXT NOT NULL REFERENCES capital_accounts (id),
	asset TEXT NOT NULL,
	settled TEXT NOT NULL,
	encumbered TEXT NOT NULL DEFAULT '0',
	reserved TEXT NOT NULL DEFAULT '0',
	revision INTEGER NOT NULL DEFAULT 1,
	as_of TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (account_id, asset)
);

CREATE TABLE IF NOT EXISTS capital_allocations (
	id TEXT PRIMARY KEY,
	account_id TEXT NOT NULL REFERENCES capital_accounts (id),
	organization_id UUID NOT NULL,
	portfolio_id UUID NOT NULL,
	grant_id UUID NOT NULL,
	state TEXT NOT NULL,
	limit_amount TEXT NOT NULL,
	limit_currency TEXT NOT NULL,
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capital_reservations (
	id TEXT PRIMARY KEY,
	account_id TEXT NOT NULL REFERENCES capital_accounts (id),
	organization_id UUID NOT NULL,
	portfolio_id UUID NOT NULL,
	grant_id UUID NOT NULL,
	intent_hash TEXT NOT NULL,
	asset TEXT NOT NULL,
	amount TEXT NOT NULL,
	reservation_kind TEXT NOT NULL,
	status TEXT NOT NULL,
	expires_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capital_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
