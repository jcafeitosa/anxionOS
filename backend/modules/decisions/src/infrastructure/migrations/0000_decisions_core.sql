-- decisions module baseline schema (ANX-149 slice S1).
-- Tables align with repository SQL in persistence/repositories.ts.

DO $$ BEGIN
	CREATE TYPE decisions_execution_mode AS ENUM ('SIMULATED', 'PAPER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS decisions_records (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	grant_id UUID NOT NULL,
	expected_authority_epoch INTEGER NOT NULL,
	correlation_id UUID NOT NULL,
	status TEXT NOT NULL CHECK (
		status IN ('PROPOSED', 'AUTHORITY_CHECKED', 'SUBMITTED')
	),
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS decisions_records_organization_id_idx
	ON decisions_records (organization_id);

CREATE TABLE IF NOT EXISTS decisions_proposals (
	id TEXT PRIMARY KEY,
	decision_id TEXT NOT NULL REFERENCES decisions_records (id),
	organization_id UUID NOT NULL,
	proposal_kind TEXT NOT NULL CHECK (
		proposal_kind IN ('TRADE', 'REBALANCE', 'WITHDRAWAL', 'HEDGE')
	),
	status TEXT NOT NULL CHECK (
		status IN ('OPEN', 'ACCEPTED', 'SUPERSEDED', 'REJECTED', 'EXPIRED')
	),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS decisions_proposals_decision_id_idx
	ON decisions_proposals (decision_id);

CREATE TABLE IF NOT EXISTS decisions_trade_intents (
	id TEXT PRIMARY KEY,
	decision_id TEXT NOT NULL REFERENCES decisions_records (id),
	organization_id UUID NOT NULL,
	intent_hash TEXT NOT NULL,
	instrument_id UUID NOT NULL,
	side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
	quantity TEXT NOT NULL,
	price TEXT NOT NULL,
	execution_mode decisions_execution_mode NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS decisions_trade_intents_decision_uidx
	ON decisions_trade_intents (decision_id);

CREATE UNIQUE INDEX IF NOT EXISTS decisions_trade_intents_org_intent_hash_uidx
	ON decisions_trade_intents (organization_id, intent_hash);

CREATE TABLE IF NOT EXISTS decisions_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS decisions_command_journal_organization_id_idx
	ON decisions_command_journal (organization_id);
