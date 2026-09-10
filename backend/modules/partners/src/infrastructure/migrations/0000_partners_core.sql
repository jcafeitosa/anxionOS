-- partners module baseline schema (ANX-157 / ANX-324 read infra)
CREATE TABLE IF NOT EXISTS partners_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	invoice_id TEXT,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
