-- execution module baseline schema (ANX-151 slice S1).
-- Tables align with repository SQL in persistence/repositories.ts.

DO $$ BEGIN
	CREATE TYPE execution_execution_mode AS ENUM ('SIMULATED', 'PAPER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS execution_venue_adapter_refs (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	adapter_kind TEXT NOT NULL CHECK (adapter_kind IN ('SIMULATED')),
	status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS execution_venue_adapter_refs_org_kind_uidx
	ON execution_venue_adapter_refs (organization_id, adapter_kind);

CREATE INDEX IF NOT EXISTS execution_venue_adapter_refs_organization_id_idx
	ON execution_venue_adapter_refs (organization_id);

CREATE TABLE IF NOT EXISTS execution_sessions (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
	intent_hash TEXT NOT NULL,
	risk_permit_id TEXT NOT NULL,
	authority_epoch INTEGER NOT NULL,
	risk_epoch INTEGER NOT NULL,
	execution_mode execution_execution_mode NOT NULL,
	venue_adapter_ref_id TEXT NOT NULL REFERENCES execution_venue_adapter_refs (id),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS execution_sessions_organization_id_idx
	ON execution_sessions (organization_id);

CREATE TABLE IF NOT EXISTS execution_orders (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	session_id TEXT NOT NULL REFERENCES execution_sessions (id),
	client_order_id TEXT NOT NULL,
	instrument_id TEXT NOT NULL,
	side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
	quantity NUMERIC(24, 8) NOT NULL,
	price NUMERIC(24, 8) NOT NULL,
	status TEXT NOT NULL CHECK (
		status IN ('SUBMITTED', 'FILLED', 'CANCELLED')
	),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS execution_orders_org_client_order_uidx
	ON execution_orders (organization_id, client_order_id);

CREATE INDEX IF NOT EXISTS execution_orders_session_id_idx
	ON execution_orders (session_id);

CREATE TABLE IF NOT EXISTS execution_fills (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	order_id TEXT NOT NULL REFERENCES execution_orders (id),
	venue_fill_id TEXT NOT NULL,
	quantity NUMERIC(24, 8) NOT NULL,
	price NUMERIC(24, 8) NOT NULL,
	notional_amount NUMERIC(24, 8) NOT NULL,
	asset TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'REJECTED')),
	filled_at TIMESTAMPTZ NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS execution_fills_venue_fill_id_uidx
	ON execution_fills (venue_fill_id);

CREATE INDEX IF NOT EXISTS execution_fills_order_id_idx
	ON execution_fills (order_id);

CREATE TABLE IF NOT EXISTS execution_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	client_order_id TEXT,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS execution_command_journal_organization_id_idx
	ON execution_command_journal (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS execution_command_journal_org_client_order_uidx
	ON execution_command_journal (organization_id, client_order_id)
	WHERE client_order_id IS NOT NULL;
