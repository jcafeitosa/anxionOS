-- market-data calendar/session schema (ANX-146 slice B).
--
-- venue calendars: one row per venue+timezone+asset-class.
-- trading sessions: one row per venue-calendar+date (with 24x7 shortcut).
--
-- Idempotent: all DDL uses CREATE TABLE IF NOT EXISTS / INDEX IF NOT EXISTS
-- and ALTER ... ADD CONSTRAINT IF NOT EXISTS / EXCEPTION WHEN duplicate_object.

DO $$ BEGIN
    CREATE TYPE market_data_venue_scope AS ENUM ('stocks', 'crypto', 'both');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE market_data_session_status AS ENUM ('open', 'closed', 'holiday');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Venue calendars (D-MD-016 / ANX-146-SLICE-B).
-- PK: venue_id (ensures one calendar per venue).
-- iana_timezone: e.g. "America/New_York", "Asia/Tokyo".
-- scope: stocks|crypto|both — which markets this calendar applies to.
-- is_24x7: when true, the venue operates 24x7 per date (crypto shortcut, no
--   per-hour sessions enumerated). Defaults to false for stock venues.
-- created_at / updated_at for auditing.
CREATE TABLE IF NOT EXISTS market_data_venue_calendars (
    id TEXT PRIMARY KEY DEFAULT 'md_cal_' || gen_random_uuid(),
    venue_id TEXT NOT NULL,
    iana_timezone TEXT NOT NULL,
    scope market_data_venue_scope NOT NULL DEFAULT 'stocks',
    is_24x7 BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_market_data_venue_calendars_venue_id UNIQUE (venue_id)
);

-- Trading sessions (D-MD-017 / ANX-146-SLICE-B).
-- One row per (venue_calendar_id, session_date).
-- For stock venues: open_at / close_at define the trading window.
-- For crypto venues with is_24x7=true: open_at=midnight UTC, close_at=midnight UTC next day,
--   effectively 24/7 per date (no per-trading-hour rows needed).
-- is_holiday: when true, the session is a holiday (open_at/close_at may be omitted
--   or set to a no-op window, callers must check is_holiday first).
-- UNIQUE(venue_calendar_id, session_date).
CREATE TABLE IF NOT EXISTS market_data_trading_sessions (
    id TEXT PRIMARY KEY DEFAULT 'md_sess_' || gen_random_uuid(),
    venue_calendar_id TEXT NOT NULL REFERENCES market_data_venue_calendars (id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    open_at TIMESTAMPTZ NOT NULL,
    close_at TIMESTAMPTZ NOT NULL,
    is_holiday BOOLEAN NOT NULL DEFAULT false,
    is_24x7 BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_market_data_trading_sessions_cal_date UNIQUE (venue_calendar_id, session_date)
);

-- Index for fast "find session for this date and calendar"
CREATE INDEX IF NOT EXISTS market_data_sessions_cal_idx
    ON market_data_trading_sessions (venue_calendar_id, session_date);

-- Index for fast "find sessions on this date across calendars"
CREATE INDEX IF NOT EXISTS market_data_sessions_date_idx
    ON market_data_trading_sessions (session_date);

-- Comment: DST transition handling.
-- open_at/close_at are stored in UTC (TIMESTAMPTZ). Application logic must
-- resolve the trading window in the venue's iana_timezone for DST-aware
-- comparisons. This schema stores absolute UTC boundaries; the DST decision
-- lives in the application layer, not the DB.