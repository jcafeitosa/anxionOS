-- ANX-146 slice C: FX rates + corporate actions (raw vs adjusted, point-in-time provenance).
--
-- 0002_market_data_fx_corporate_actions adds:
--   market_data_fx_rates  — per-pair rates published by a source, with point-in-time as_of timestamps.
--   market_data_corporate_actions  — corporate events (split/dividend/merger/spin-off)
--       that affect historical price adjustment, with point-in-time recorded_at.

-- ── market_data_fx_rates ──────────────────────────────────────────────────────────
CREATE TYPE market_data_fx_rate_kind AS ENUM ('PUBLISHED', 'CORRECTED');

DO $$ BEGIN
	CREATE TYPE market_data_fx_rate_source AS ENUM (
		'INTERCONTINENTAL_EXCHANGE',
		'CURRENCY_API',
		'FIX_PROTOCOL',
		'CONSORTIUM'
	);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE market_data_fx_rate_kind AS ENUM ('PUBLISHED', 'CORRECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS market_data_fx_rates (
	id TEXT PRIMARY KEY,
	base_currency TEXT NOT NULL,
	quote_currency TEXT NOT NULL,
	rate NUMERIC(24,8) NOT NULL,
	as_of TIMESTAMPTZ NOT NULL,
	source market_data_fx_rate_source NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT uq_market_data_fx_rates_unique_pair_source_instant
		UNIQUE (base_currency, quote_currency, as_of, source)
);

-- ── market_data_corporate_actions ───────────────────────────────────────────────
DO $$ BEGIN
	CREATE TYPE market_data_corporate_action_kind AS ENUM (
		'SPLIT',
		'DIVIDEND',
		'MERGER',
		'SPINOFF'
	);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS market_data_corporate_actions (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	instrument_id TEXT NOT NULL REFERENCES market_data_instruments (id),
	action_kind market_data_corporate_action_kind NOT NULL,
	effective_date DATE NOT NULL,
	raw_payload JSONB NOT NULL,
	adjustment_factor NUMERIC(24,10) NULL,
	source TEXT NOT NULL,
	recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT uq_market_data_corporate_actions_unique_natural_key
		UNIQUE (organization_id, instrument_id, action_kind, effective_date, source)
);