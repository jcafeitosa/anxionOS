/** SQL bootstrap for journal/outbox/inbox (idempotent). */
export const EVENTING_DDL = `
CREATE TABLE IF NOT EXISTS domain_journal (
	event_id TEXT PRIMARY KEY,
	owner_domain TEXT NOT NULL,
	event_type TEXT NOT NULL,
	schema_version TEXT NOT NULL,
	occurred_at TIMESTAMPTZ NOT NULL,
	recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
	event_id TEXT PRIMARY KEY,
	owner_domain TEXT NOT NULL,
	event_type TEXT NOT NULL,
	schema_version TEXT NOT NULL,
	occurred_at TIMESTAMPTZ NOT NULL,
	payload JSONB NOT NULL,
	status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published')),
	dispatched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox (status, occurred_at)
	WHERE status = 'pending';

ALTER TABLE outbox ADD COLUMN IF NOT EXISTS relay_claimed_by TEXT;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS relay_lease_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS outbox_relay_claim_idx ON outbox (
	status,
	relay_lease_expires_at,
	owner_domain,
	occurred_at
) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS inbox (
	event_id TEXT NOT NULL,
	consumer_name TEXT NOT NULL,
	processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (event_id, consumer_name)
);

CREATE TABLE IF NOT EXISTS dead_letter_queue (
	event_id TEXT PRIMARY KEY,
	owner_domain TEXT NOT NULL,
	event_type TEXT NOT NULL,
	schema_version TEXT NOT NULL,
	occurred_at TIMESTAMPTZ NOT NULL,
	payload JSONB NOT NULL,
	reason TEXT NOT NULL,
	attempts INTEGER NOT NULL DEFAULT 0,
	moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dlq_owner_domain_idx ON dead_letter_queue (owner_domain, moved_at);
`;
