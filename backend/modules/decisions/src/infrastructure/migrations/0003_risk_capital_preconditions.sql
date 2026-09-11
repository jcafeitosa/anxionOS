-- ANX-149 S4: risk.check.completed + capital.reservation.created preconditions for submitIntent.

DO $$ BEGIN
	ALTER TYPE decisions_status ADD VALUE 'RISK_PENDING';
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TYPE decisions_status ADD VALUE 'RISK_CHECKED';
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TYPE decisions_status ADD VALUE 'CAPITAL_PENDING';
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN undefined_object THEN null;
END $$;

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
				'RISK_PENDING',
				'RISK_CHECKED',
				'CAPITAL_PENDING',
				'WAITING_APPROVAL',
				'APPROVED',
				'DENIED',
				'SUBMITTED'
			)
		);
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS decisions_submit_preconditions (
	decision_id TEXT PRIMARY KEY REFERENCES decisions_records (id),
	organization_id UUID NOT NULL,
	intent_hash TEXT NOT NULL,
	risk_check_id TEXT,
	risk_check_result TEXT CHECK (
		risk_check_result IS NULL OR risk_check_result IN ('PASS', 'DENY', 'DEFER')
	),
	capital_reservation_id TEXT,
	risk_event_id UUID,
	capital_event_id UUID,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS decisions_submit_preconditions_org_intent_uidx
	ON decisions_submit_preconditions (organization_id, intent_hash);

CREATE UNIQUE INDEX IF NOT EXISTS decisions_submit_preconditions_risk_event_uidx
	ON decisions_submit_preconditions (risk_event_id)
	WHERE risk_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS decisions_submit_preconditions_capital_event_uidx
	ON decisions_submit_preconditions (capital_event_id)
	WHERE capital_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS decisions_submit_preconditions_organization_id_idx
	ON decisions_submit_preconditions (organization_id);
