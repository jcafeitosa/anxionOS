-- market-data backfill jobs (ANX-146 slice A).
--
-- Additive migration on top of 0000_market_data_core.sql: does not touch any
-- existing table/type from that migration. Every statement is written to be
-- safe to run twice (CREATE ... IF NOT EXISTS / DO $$ ... EXCEPTION WHEN
-- duplicate_object) following the same idempotent-migration convention.
DO $$ BEGIN
	CREATE TYPE market_data_backfill_job_status AS ENUM (
		'PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED'
	);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Backfill job registry (D-MD-146-A). id is the contract-shaped
-- "md_bf_<uuid>" string, not a bare UUID column, so it stays TEXT — mirrors
-- market_data_instruments.id in 0000_market_data_core.sql.
CREATE TABLE IF NOT EXISTS market_data_backfill_jobs (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	instrument_id TEXT NOT NULL REFERENCES market_data_instruments (id),
	requested_from TIMESTAMPTZ NOT NULL,
	requested_to TIMESTAMPTZ NOT NULL,
	cursor_position TEXT,
	status market_data_backfill_job_status NOT NULL DEFAULT 'PENDING',
	last_error TEXT,
	rows_ingested INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
	ALTER TABLE market_data_backfill_jobs
		ADD CONSTRAINT market_data_backfill_jobs_range_chk
		CHECK (requested_from < requested_to);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE market_data_backfill_jobs
		ADD CONSTRAINT market_data_backfill_jobs_rows_ingested_chk
		CHECK (rows_ingested >= 0);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Enforces the natural-key uniqueness startBackfill's idempotency depends on:
-- one job row per (organization, instrument, requested_from, requested_to).
-- A concurrent double "start backfill" for the identical window now fails the
-- INSERT under this index instead of creating two rows for the same window;
-- backfill-repository.ts turns that into a graceful idempotent-replay via
-- ON CONFLICT ... DO UPDATE ... RETURNING (same idiom as
-- market_data_instruments_natural_uidx in 0000_market_data_core.sql).
CREATE UNIQUE INDEX IF NOT EXISTS market_data_backfill_jobs_natural_uidx
	ON market_data_backfill_jobs (organization_id, instrument_id, requested_from, requested_to);

-- Supports findActiveByInstrument's "is there already an active backfill for
-- this instrument" lookup without a sequential scan.
CREATE INDEX IF NOT EXISTS market_data_backfill_jobs_active_idx
	ON market_data_backfill_jobs (organization_id, instrument_id, status);
