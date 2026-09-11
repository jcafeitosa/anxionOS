-- portfolios module baseline schema (ANX-153 slice S1).
-- Tables align with repository SQL in persistence/repositories.ts.

DO $$ BEGIN
	CREATE TYPE portfolios_execution_mode AS ENUM ('SIMULATED', 'PAPER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS portfolios_portfolios (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	owner_user_id UUID NOT NULL,
	capital_account_id TEXT NOT NULL,
	name TEXT NOT NULL,
	base_currency TEXT NOT NULL,
	execution_mode portfolios_execution_mode NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'CLOSED')),
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolios_portfolios_organization_id_idx
	ON portfolios_portfolios (organization_id);

CREATE INDEX IF NOT EXISTS portfolios_portfolios_capital_account_id_idx
	ON portfolios_portfolios (capital_account_id);

CREATE TABLE IF NOT EXISTS portfolios_positions (
	id TEXT PRIMARY KEY,
	portfolio_id TEXT NOT NULL REFERENCES portfolios_portfolios (id),
	organization_id UUID NOT NULL,
	instrument_id TEXT NOT NULL,
	position_side TEXT NOT NULL CHECK (position_side IN ('LONG', 'SHORT', 'CASH')),
	book TEXT NOT NULL CHECK (book IN ('TRADING')),
	quantity NUMERIC NOT NULL DEFAULT 0,
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolios_positions_key_uidx
	ON portfolios_positions (portfolio_id, instrument_id, position_side, book);

CREATE INDEX IF NOT EXISTS portfolios_positions_organization_id_idx
	ON portfolios_positions (organization_id);

CREATE TABLE IF NOT EXISTS portfolios_holdings (
	id TEXT PRIMARY KEY,
	position_id TEXT NOT NULL REFERENCES portfolios_positions (id),
	organization_id UUID NOT NULL,
	fill_id TEXT NOT NULL,
	quantity NUMERIC NOT NULL,
	price NUMERIC NOT NULL,
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolios_holdings_org_fill_uidx
	ON portfolios_holdings (organization_id, fill_id);

CREATE INDEX IF NOT EXISTS portfolios_holdings_position_id_idx
	ON portfolios_holdings (position_id);

CREATE TABLE IF NOT EXISTS portfolios_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolios_command_journal_organization_id_idx
	ON portfolios_command_journal (organization_id);
