-- capital module baseline schema (ANX-126 / P06 flow).
-- Tables align with capital-unit-of-work repositories. Money columns are NUMERIC
-- because the repositories aggregate them in SQL (SUM(amount) in
-- repositories.ts) and subtract settled balances (ANX-463).

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

CREATE INDEX IF NOT EXISTS capital_accounts_organization_id_idx
	ON capital_accounts (organization_id);

CREATE TABLE IF NOT EXISTS capital_balance_lines (
	account_id TEXT NOT NULL REFERENCES capital_accounts (id),
	asset TEXT NOT NULL,
	settled NUMERIC(24, 8) NOT NULL,
	encumbered NUMERIC(24, 8) NOT NULL DEFAULT 0,
	reserved NUMERIC(24, 8) NOT NULL DEFAULT 0,
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
	limit_amount NUMERIC(24, 8) NOT NULL,
	limit_currency TEXT NOT NULL,
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS capital_allocations_organization_id_idx
	ON capital_allocations (organization_id);

CREATE TABLE IF NOT EXISTS capital_reservations (
	id TEXT PRIMARY KEY,
	account_id TEXT NOT NULL REFERENCES capital_accounts (id),
	organization_id UUID NOT NULL,
	portfolio_id UUID NOT NULL,
	grant_id UUID NOT NULL,
	intent_hash TEXT NOT NULL,
	asset TEXT NOT NULL,
	amount NUMERIC(24, 8) NOT NULL,
	reservation_kind TEXT NOT NULL,
	status TEXT NOT NULL,
	expires_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS capital_reservations_organization_id_idx
	ON capital_reservations (organization_id);

CREATE INDEX IF NOT EXISTS capital_reservations_intent_hash_idx
	ON capital_reservations (intent_hash);

CREATE TABLE IF NOT EXISTS capital_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);