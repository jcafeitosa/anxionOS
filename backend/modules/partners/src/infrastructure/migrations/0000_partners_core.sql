-- partners module baseline schema (ANX-157 / ANX-324 read infra)
CREATE TABLE IF NOT EXISTS partners_command_journal (
	organization_id UUID NOT NULL,
	command_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	request_hash TEXT,
	invoice_id TEXT,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (organization_id, command_id)
);

CREATE INDEX IF NOT EXISTS partners_command_journal_organization_id_idx
	ON partners_command_journal (organization_id);
CREATE INDEX IF NOT EXISTS partners_command_journal_invoice_id_idx
	ON partners_command_journal (invoice_id)
	WHERE invoice_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS partners_partners (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	referral_code TEXT NOT NULL,
	display_name TEXT NOT NULL,
	commission_rate TEXT NOT NULL,
	referred_organization_id UUID NOT NULL,
	status TEXT NOT NULL,
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS partners_partners_org_referral_uidx
	ON partners_partners (organization_id, referral_code);
CREATE UNIQUE INDEX IF NOT EXISTS partners_partners_org_referred_uidx
	ON partners_partners (organization_id, referred_organization_id);
CREATE INDEX IF NOT EXISTS partners_partners_organization_id_idx
	ON partners_partners (organization_id);

CREATE TABLE IF NOT EXISTS partners_commission_accruals (
	id TEXT PRIMARY KEY,
	partner_id TEXT NOT NULL REFERENCES partners_partners (id),
	partner_organization_id UUID NOT NULL,
	referred_organization_id UUID NOT NULL,
	invoice_id TEXT NOT NULL,
	invoice_total_amount TEXT NOT NULL,
	commission_rate TEXT NOT NULL,
	commission_amount TEXT NOT NULL,
	status TEXT NOT NULL,
	accrued_at TIMESTAMPTZ NOT NULL,
	reversed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A pre-P07 database may already contain this table while lacking the
-- per-module Drizzle journal. Upgrade it before the indexes below are
-- created, otherwise the first bootstrap fails on partner_organization_id
-- before 0001_partners_legacy_upgrade can run.
DO $$
DECLARE
	legacy_organization_column BOOLEAN;
	missing_ownership BIGINT;
BEGIN
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

CREATE INDEX IF NOT EXISTS partners_payouts_partner_org_idx
	ON partners_payouts (partner_organization_id);
CREATE INDEX IF NOT EXISTS partners_payouts_partner_id_idx
	ON partners_payouts (partner_id);
