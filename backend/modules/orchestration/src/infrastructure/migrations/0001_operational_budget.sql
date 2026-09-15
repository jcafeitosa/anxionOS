-- Durable wakeup budget consumed by the orchestration heartbeat worker.
CREATE TABLE IF NOT EXISTS orchestration_operational_budgets (
	organization_id TEXT PRIMARY KEY,
	cap_units INTEGER NOT NULL CHECK (cap_units > 0),
	consumed_units INTEGER NOT NULL DEFAULT 0 CHECK (consumed_units >= 0),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CHECK (consumed_units <= cap_units)
);
