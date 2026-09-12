-- billing module baseline schema
-- Derived strictly from the repository contract:
--   modules/billing/src/infrastructure/persistence/{repositories,command-journal-repository}.ts

CREATE TABLE IF NOT EXISTS billing_subscriptions (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	plan_code TEXT NOT NULL,
	billing_period_start TIMESTAMPTZ NOT NULL,
	billing_period_end TIMESTAMPTZ NOT NULL,
	status TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_subscriptions_org_plan_uidx
 ON billing_subscriptions (organization_id, plan_code);

CREATE TABLE IF NOT EXISTS billing_invoices (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	subscription_id TEXT NOT NULL REFERENCES billing_subscriptions (id),
	billing_period TEXT NOT NULL,
	status TEXT NOT NULL,
	total_amount TEXT NOT NULL DEFAULT '0',
	issued_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_invoices_subscription_period_uidx
 ON billing_invoices (subscription_id, billing_period);

CREATE TABLE IF NOT EXISTS billing_invoice_lines (
	id TEXT PRIMARY KEY,
	invoice_id TEXT NOT NULL REFERENCES billing_invoices (id),
	organization_id UUID NOT NULL,
	usage_record_id TEXT,
	description TEXT NOT NULL,
	quantity TEXT NOT NULL,
	unit_price TEXT NOT NULL,
	amount TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS billing_invoice_lines_invoice_id_idx
 ON billing_invoice_lines (invoice_id);
CREATE INDEX IF NOT EXISTS billing_invoice_lines_usage_record_id_idx
 ON billing_invoice_lines (usage_record_id);

CREATE TABLE IF NOT EXISTS billing_usage_aggregations (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	subscription_id TEXT NOT NULL,
	usage_record_id TEXT NOT NULL,
	billing_period TEXT NOT NULL,
	quantity TEXT NOT NULL,
	unit TEXT NOT NULL,
	unit_price TEXT NOT NULL,
	amount TEXT NOT NULL,
	consumer_kind TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS billing_usage_aggregations_usage_record_idx
 ON billing_usage_aggregations (usage_record_id);

CREATE TABLE IF NOT EXISTS billing_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	usage_record_id TEXT,
	webhook_event_id TEXT,
	response_snapshot JSONB
);

CREATE INDEX IF NOT EXISTS billing_command_journal_org_idx
 ON billing_command_journal (organization_id);
CREATE INDEX IF NOT EXISTS billing_command_journal_usage_record_idx
 ON billing_command_journal (usage_record_id);