-- ANX-150 S4: epoch consumer dedup + permit revocation index.

CREATE TABLE IF NOT EXISTS risk_consumer_dedup (
	event_id UUID PRIMARY KEY,
	consumer_name TEXT NOT NULL,
	organization_id UUID NOT NULL,
	processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS risk_consumer_dedup_organization_id_idx
	ON risk_consumer_dedup (organization_id);

CREATE INDEX IF NOT EXISTS risk_permits_org_status_epoch_idx
	ON risk_permits (organization_id, status, risk_epoch)
	WHERE status = 'ISSUED';
