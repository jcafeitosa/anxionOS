-- ANX-151 S4: venue reconciliation cases, dispatch attempts, UNKNOWN tracking.

ALTER TABLE execution_orders
	ADD COLUMN IF NOT EXISTS venue_dispatch_status TEXT;

ALTER TABLE execution_orders
	DROP CONSTRAINT IF EXISTS execution_orders_venue_dispatch_status_check;

ALTER TABLE execution_orders
	ADD CONSTRAINT execution_orders_venue_dispatch_status_check
	CHECK (
		venue_dispatch_status IS NULL
		OR venue_dispatch_status IN (
			'DISPATCHED',
			'ACK',
			'UNKNOWN',
			'RECONCILING',
			'FAILED'
		)
	);

CREATE TABLE IF NOT EXISTS execution_order_attempts (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	order_id TEXT NOT NULL REFERENCES execution_orders (id),
	attempt_no INTEGER NOT NULL,
	adapter_kind TEXT NOT NULL,
	request_hash TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('SENT', 'ACK', 'REJECT', 'TIMEOUT')),
	response_code TEXT,
	error_code TEXT,
	sent_at TIMESTAMPTZ NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS execution_order_attempts_order_id_idx
	ON execution_order_attempts (order_id);

CREATE UNIQUE INDEX IF NOT EXISTS execution_order_attempts_order_attempt_uidx
	ON execution_order_attempts (order_id, attempt_no);

CREATE TABLE IF NOT EXISTS execution_reconciliation_cases (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	case_kind TEXT NOT NULL CHECK (
		case_kind IN (
			'ORDER_STATUS_MISMATCH',
			'FILL_MISSING',
			'DUPLICATE_VENUE_FILL'
		)
	),
	status TEXT NOT NULL CHECK (
		status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'ESCALATED')
	),
	order_id TEXT REFERENCES execution_orders (id),
	fill_id TEXT REFERENCES execution_fills (id),
	venue_adapter_ref_id TEXT NOT NULL,
	venue_fill_id TEXT,
	evidence TEXT,
	disposition TEXT,
	disposition_rationale TEXT,
	opened_at TIMESTAMPTZ NOT NULL,
	resolved_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS execution_reconciliation_cases_organization_id_idx
	ON execution_reconciliation_cases (organization_id);

CREATE INDEX IF NOT EXISTS execution_reconciliation_cases_order_id_idx
	ON execution_reconciliation_cases (order_id)
	WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS execution_reconciliation_cases_venue_fill_id_idx
	ON execution_reconciliation_cases (venue_fill_id)
	WHERE venue_fill_id IS NOT NULL;
