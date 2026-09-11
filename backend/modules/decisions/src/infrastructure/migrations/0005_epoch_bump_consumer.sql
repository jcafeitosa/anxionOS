-- ANX-150 S4: decisions integration for risk.epoch.bumped.v1.

CREATE TABLE IF NOT EXISTS decisions_consumer_dedup (
	event_id UUID PRIMARY KEY,
	consumer_name TEXT NOT NULL,
	organization_id UUID NOT NULL,
	processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS decisions_consumer_dedup_organization_id_idx
	ON decisions_consumer_dedup (organization_id);
