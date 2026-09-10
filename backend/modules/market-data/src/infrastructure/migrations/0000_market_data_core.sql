-- market-data module baseline schema (ANX-145 slice 1).
--
-- NOTE (ANX-145 G0 finding): the shared local dev Postgres/Timescale already
-- held an undocumented market_data_* schema (instruments/specs/aliases/
-- headers/observations_ts/command_journal) with no corresponding migration
-- anywhere in git — provenance unknown, not attributable to this delivery.
-- Every statement below is written to be safe against BOTH a fresh database
-- (CREATE TABLE ... IF NOT EXISTS) and that already-populated one (ALTER
-- TABLE ... ADD COLUMN IF NOT EXISTS / CREATE INDEX ... IF NOT EXISTS), so it
-- converges to the same shape either way instead of silently no-op'ing on
-- the parts that already existed.
DO $$ BEGIN
	CREATE TYPE market_data_instrument_kind AS ENUM (
		'SPOT', 'PERP', 'FUTURE', 'OPTION', 'INDEX'
	);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE market_data_instrument_status AS ENUM (
		'DRAFT', 'ACTIVE', 'SUSPENDED', 'DELISTED', 'DRAINING'
	);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE market_data_execution_mode AS ENUM ('SIMULATED', 'PAPER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE market_data_observation_kind AS ENUM (
		'TRADE', 'QUOTE', 'MARK', 'FUNDING', 'INDEX'
	);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE market_data_quality_flag AS ENUM ('OK', 'STALE', 'ESTIMATED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Instrument registry (D-MD-001, D-MD-006). id is the contract-shaped
-- "md_ins_<uuid>" string, not a bare UUID column, so it stays TEXT.
CREATE TABLE IF NOT EXISTS market_data_instruments (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	canonical_symbol TEXT NOT NULL,
	instrument_kind market_data_instrument_kind NOT NULL,
	asset_id TEXT NOT NULL,
	venue_id TEXT NOT NULL,
	execution_mode market_data_execution_mode NOT NULL,
	status market_data_instrument_status NOT NULL DEFAULT 'ACTIVE',
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE market_data_instruments
	ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS market_data_instruments_natural_key_idx
	ON market_data_instruments (organization_id, canonical_symbol, venue_id);

-- Enforces the natural-key uniqueness registerInstrument's idempotency
-- depends on (D-MD-001): only one ACTIVE instrument per
-- (organization, canonical_symbol, venue) at a time. A concurrent double
-- registration now fails the INSERT under this index instead of silently
-- creating two ACTIVE rows for the same key; repositories.ts turns that
-- into a graceful idempotent-replay via ON CONFLICT ... DO UPDATE RETURNING.
CREATE UNIQUE INDEX IF NOT EXISTS market_data_instruments_natural_uidx
	ON market_data_instruments (organization_id, canonical_symbol, venue_id)
	WHERE status = 'ACTIVE';

-- Observation headers: OLTP dedup/metadata record, one row per confirmed
-- observation (D-MD-003). This stays a regular table (not a hypertable) so
-- the UNIQUE(organization_id, source_event_id) dedup constraint below does
-- not have to carry the TimescaleDB partition-column restriction; the pure
-- time-series fact table is market_data_observations_ts below.
CREATE TABLE IF NOT EXISTS market_data_observation_headers (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	instrument_id TEXT NOT NULL REFERENCES market_data_instruments (id),
	observation_kind market_data_observation_kind NOT NULL,
	source_event_id UUID NOT NULL,
	event_time TIMESTAMPTZ NOT NULL,
	receive_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	-- NUMERIC(24,8): matches the pre-existing undocumented schema found on
	-- this dev instance and gives every instrument (stocks and crypto alike,
	-- down to satoshi-level precision) a single, consistent decimal scale.
	-- Readers get a fixed-scale string back (e.g. "150.25000000"), not the
	-- caller's original literal — compare numerically, not by string equality.
	price NUMERIC(24, 8) NOT NULL,
	volume NUMERIC(24, 8),
	execution_mode market_data_execution_mode NOT NULL,
	quality_flag market_data_quality_flag NOT NULL DEFAULT 'OK',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE market_data_observation_headers
	ADD COLUMN IF NOT EXISTS receive_time TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Dedup guard for "reconexão não duplica" (D-MD-004): only one header per
-- (organization, sourceEventId). Already present in the pre-existing
-- undocumented schema under a different index name; kept here under a
-- deterministic name so a fresh database converges to the same guarantee.
DO $$ BEGIN
	ALTER TABLE market_data_observation_headers
		ADD CONSTRAINT market_data_observation_headers_source_event_unique
		UNIQUE (organization_id, source_event_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Supports getPriceAsOf's "latest observation for instrument" lookup
-- (D-MD-005) without a sequential scan.
CREATE INDEX IF NOT EXISTS market_data_observation_headers_latest_idx
	ON market_data_observation_headers (organization_id, instrument_id, event_time DESC);

-- Pure time-series fact table (D-MD-002, D-MD-016), converted to a
-- TimescaleDB hypertable below. Append-only: rollups/candles are a
-- follow-up slice (D-MD-012), not built on top of this table in place.
CREATE TABLE IF NOT EXISTS market_data_observations_ts (
	event_time TIMESTAMPTZ NOT NULL,
	receive_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	organization_id UUID NOT NULL,
	instrument_id TEXT NOT NULL,
	observation_header_id TEXT NOT NULL,
	observation_kind market_data_observation_kind NOT NULL,
	price NUMERIC(24, 8) NOT NULL,
	volume NUMERIC(24, 8)
);

ALTER TABLE market_data_observations_ts
	ADD COLUMN IF NOT EXISTS receive_time TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS market_data_observations_ts_org_instrument_idx
	ON market_data_observations_ts (organization_id, instrument_id, event_time DESC);

SELECT create_hypertable(
	'market_data_observations_ts',
	'event_time',
	if_not_exists => TRUE,
	migrate_data => TRUE
);

-- Command journal (D-MD-014): HTTP/command idempotency, 90d hot PG per matrix.
CREATE TABLE IF NOT EXISTS market_data_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
