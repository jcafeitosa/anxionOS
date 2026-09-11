-- ANX-149 S3: disposition + approval flow + WAITING_HUMAN hook support.

DO $$ BEGIN
	ALTER TYPE decisions_status ADD VALUE 'WAITING_APPROVAL';
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TYPE decisions_status ADD VALUE 'APPROVED';
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TYPE decisions_status ADD VALUE 'DENIED';
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN undefined_object THEN null;
END $$;

ALTER TABLE decisions_records
	ADD COLUMN IF NOT EXISTS proposer_id UUID,
	ADD COLUMN IF NOT EXISTS run_id TEXT,
	ADD COLUMN IF NOT EXISTS approval_path BOOLEAN NOT NULL DEFAULT FALSE;

DO $$ BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'decisions_records'
		  AND column_name = 'status'
		  AND data_type = 'text'
	) THEN
		ALTER TABLE decisions_records DROP CONSTRAINT IF EXISTS decisions_records_status_check;
		ALTER TABLE decisions_records ADD CONSTRAINT decisions_records_status_check CHECK (
			status IN (
				'PROPOSED',
				'AUTHORITY_CHECKED',
				'WAITING_APPROVAL',
				'APPROVED',
				'DENIED',
				'SUBMITTED'
			)
		);
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS decisions_approvals (
	id TEXT PRIMARY KEY,
	decision_id TEXT NOT NULL REFERENCES decisions_records (id),
	organization_id UUID NOT NULL,
	proposer_id UUID NOT NULL,
	approver_id UUID,
	status TEXT NOT NULL CHECK (status IN ('PENDING', 'GRANTED', 'DENIED')),
	run_id TEXT,
	operation_id UUID,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS decisions_approvals_decision_id_idx
	ON decisions_approvals (decision_id);

CREATE UNIQUE INDEX IF NOT EXISTS decisions_approvals_pending_decision_uidx
	ON decisions_approvals (decision_id)
	WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS decisions_dispositions (
	id TEXT PRIMARY KEY,
	decision_id TEXT NOT NULL REFERENCES decisions_records (id),
	organization_id UUID NOT NULL,
	disposition_kind TEXT NOT NULL CHECK (
		disposition_kind IN ('APPROVED', 'DENIED', 'REVOKED', 'EXPIRED')
	),
	outcome TEXT NOT NULL CHECK (
		outcome IN ('UPHELD', 'OVERTURNED', 'MODIFIED', 'EXPIRED')
	),
	reason TEXT NOT NULL,
	approver_id UUID NOT NULL,
	intent_hash TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS decisions_dispositions_decision_uidx
	ON decisions_dispositions (decision_id);
