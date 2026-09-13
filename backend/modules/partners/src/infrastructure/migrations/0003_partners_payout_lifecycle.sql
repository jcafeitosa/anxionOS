ALTER TABLE partners_payouts
	ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS failure_reason TEXT,
	ADD COLUMN IF NOT EXISTS provider_reference TEXT,
	ADD COLUMN IF NOT EXISTS reversal_reference TEXT,
	ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

UPDATE partners_payouts
SET status = 'SCHEDULED'
WHERE status = 'REQUESTED';

UPDATE partners_payouts
SET status = 'PROCESSING',
	processing_at = COALESCE(approved_at, requested_at),
	attempt_count = GREATEST(attempt_count, 1)
WHERE status = 'APPROVED';

UPDATE partners_payouts
SET status = 'FAILED',
	failed_at = COALESCE(approved_at, requested_at),
	failure_reason = COALESCE(failure_reason, 'legacy payout was rejected'),
	attempt_count = GREATEST(attempt_count, 1)
WHERE status = 'REJECTED';

ALTER TABLE partners_payouts
	DROP CONSTRAINT IF EXISTS partners_payouts_status_check;

ALTER TABLE partners_payouts
	ADD CONSTRAINT partners_payouts_status_check
	CHECK (status IN ('SCHEDULED', 'PROCESSING', 'SETTLED', 'FAILED', 'REVERSED'));
