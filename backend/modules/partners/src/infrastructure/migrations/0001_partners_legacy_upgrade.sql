-- ANX-503 — upgrade the pre-P07 partners schema in place.
--
-- The original partners migration created commission ownership as
-- `organization_id` and did not create payouts. Once the repository started
-- reading `partner_organization_id`, a database whose module journal already
-- contained 0000 could skip the CREATE TABLE statements and fail at startup.
-- This migration is deliberately additive: existing rows keep their legacy
-- columns while the canonical ownership column is backfilled and constrained.

DO $$
DECLARE
	legacy_organization_column BOOLEAN;
	missing_ownership BIGINT;
BEGIN
	IF to_regclass('partners_commission_accruals') IS NULL THEN
		RETURN;
	END IF;

	ALTER TABLE partners_commission_accruals
		ADD COLUMN IF NOT EXISTS partner_organization_id UUID;

	SELECT EXISTS (
		SELECT 1
		FROM pg_attribute
		WHERE attrelid = 'partners_commission_accruals'::regclass
		  AND attname = 'organization_id'
		  AND NOT attisdropped
	) INTO legacy_organization_column;

	IF legacy_organization_column THEN
		UPDATE partners_commission_accruals
		SET partner_organization_id = organization_id
		WHERE partner_organization_id IS NULL;
	END IF;

	SELECT COUNT(*) INTO missing_ownership
	FROM partners_commission_accruals
	WHERE partner_organization_id IS NULL;
	IF missing_ownership > 0 THEN
		RAISE EXCEPTION
			'USAGE_ERROR: partners_commission_accruals has % rows without partner ownership',
			missing_ownership;
	END IF;

	ALTER TABLE partners_commission_accruals
		ALTER COLUMN partner_organization_id SET NOT NULL,
		ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACCRUED',
		ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
		ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS partners_commission_accruals_invoice_uidx
	ON partners_commission_accruals (partner_organization_id, invoice_id);
CREATE INDEX IF NOT EXISTS partners_commission_accruals_partner_org_idx
	ON partners_commission_accruals (partner_organization_id);
CREATE INDEX IF NOT EXISTS partners_commission_accruals_partner_id_idx
	ON partners_commission_accruals (partner_id);

CREATE TABLE IF NOT EXISTS partners_payouts (
	id TEXT PRIMARY KEY,
	partner_id TEXT NOT NULL REFERENCES partners_partners (id),
	partner_organization_id UUID NOT NULL,
	requested_amount TEXT NOT NULL,
	status TEXT NOT NULL,
	requested_at TIMESTAMPTZ NOT NULL,
	approved_at TIMESTAMPTZ,
	approval_reference TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
	legacy_organization_column BOOLEAN;
	missing_ownership BIGINT;
BEGIN
	ALTER TABLE partners_payouts
		ADD COLUMN IF NOT EXISTS partner_organization_id UUID;

	SELECT EXISTS (
		SELECT 1
		FROM pg_attribute
		WHERE attrelid = 'partners_payouts'::regclass
		  AND attname = 'organization_id'
		  AND NOT attisdropped
	) INTO legacy_organization_column;

	IF legacy_organization_column THEN
		UPDATE partners_payouts
		SET partner_organization_id = organization_id
		WHERE partner_organization_id IS NULL;
	END IF;

	SELECT COUNT(*) INTO missing_ownership
	FROM partners_payouts
	WHERE partner_organization_id IS NULL;
	IF missing_ownership > 0 THEN
		RAISE EXCEPTION
			'USAGE_ERROR: partners_payouts has % rows without partner ownership',
			missing_ownership;
	END IF;

	ALTER TABLE partners_payouts
		ALTER COLUMN partner_organization_id SET NOT NULL,
		ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
END $$;

CREATE INDEX IF NOT EXISTS partners_payouts_partner_org_idx
	ON partners_payouts (partner_organization_id);
CREATE INDEX IF NOT EXISTS partners_payouts_partner_id_idx
	ON partners_payouts (partner_id);
