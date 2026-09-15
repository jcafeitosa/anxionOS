/** SQL bootstrap for journal/outbox/inbox (idempotent). */
export const EVENTING_DDL = `
CREATE TABLE IF NOT EXISTS domain_journal (
	event_id TEXT PRIMARY KEY,
	owner_domain TEXT NOT NULL,
	event_type TEXT NOT NULL,
	schema_version TEXT NOT NULL,
	occurred_at TIMESTAMPTZ NOT NULL,
	recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	agency_id UUID,
	payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
	event_id TEXT PRIMARY KEY,
	owner_domain TEXT NOT NULL,
	event_type TEXT NOT NULL,
	schema_version TEXT NOT NULL,
	occurred_at TIMESTAMPTZ NOT NULL,
	agency_id UUID,
	payload JSONB NOT NULL,
	status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'dead_letter')),
	dispatched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox (status, occurred_at)
	WHERE status = 'pending';

ALTER TABLE outbox ADD COLUMN IF NOT EXISTS relay_claimed_by TEXT;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS relay_lease_expires_at TIMESTAMPTZ;
ALTER TABLE domain_journal ADD COLUMN IF NOT EXISTS agency_id UUID;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS agency_id UUID;

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
	agency_id UUID,
	payload JSONB NOT NULL,
	reason TEXT NOT NULL,
	attempts INTEGER NOT NULL DEFAULT 0,
	moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dlq_owner_domain_idx ON dead_letter_queue (owner_domain, moved_at);

ALTER TABLE dead_letter_queue ADD COLUMN IF NOT EXISTS agency_id UUID;

ALTER TABLE outbox DROP CONSTRAINT IF EXISTS outbox_status_check;
ALTER TABLE outbox ADD CONSTRAINT outbox_status_check
	CHECK (status IN ('pending', 'published', 'dead_letter'));

UPDATE domain_journal
	SET agency_id = (payload->>'agencyId')::uuid
	WHERE agency_id IS NULL
	  AND payload->>'agencyId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE outbox
	SET agency_id = (payload->>'agencyId')::uuid
	WHERE agency_id IS NULL
	  AND payload->>'agencyId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE dead_letter_queue
	SET agency_id = (payload->>'agencyId')::uuid
	WHERE agency_id IS NULL
	  AND payload->>'agencyId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
`;
