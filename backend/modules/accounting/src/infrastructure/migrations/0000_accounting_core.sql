-- accounting module baseline schema (ANX-126 / P06 flow).
-- Tables align with accounting repositories:
--   accounting_chart_accounts, accounting_journal_entries,
--   accounting_ledger_postings, accounting_command_journal

CREATE TABLE IF NOT EXISTS accounting_chart_accounts (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	code TEXT NOT NULL,
	kind TEXT NOT NULL,
	currency TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'ACTIVE',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounting_chart_accounts_org_code_uidx
	ON accounting_chart_accounts (organization_id, code);

CREATE TABLE IF NOT EXISTS accounting_journal_entries (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	entry_kind TEXT NOT NULL,
	status TEXT NOT NULL,
	idempotency_key TEXT,
	source_ref TEXT,
	value_date TIMESTAMPTZ,
	execution_mode TEXT,
	capital_account_id TEXT,
	portfolio_id UUID,
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accounting_journal_entries_organization_id_idx
	ON accounting_journal_entries (organization_id);

CREATE INDEX IF NOT EXISTS accounting_journal_entries_idempotency_key_idx
	ON accounting_journal_entries (organization_id, idempotency_key);

CREATE TABLE IF NOT EXISTS accounting_ledger_postings (
	id TEXT PRIMARY KEY,
	journal_entry_id TEXT NOT NULL REFERENCES accounting_journal_entries (id),
	organization_id UUID NOT NULL,
	account_code TEXT NOT NULL,
	debit TEXT,
	credit TEXT,
	asset TEXT NOT NULL,
	amount TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accounting_ledger_postings_journal_entry_id_idx
	ON accounting_ledger_postings (journal_entry_id);

CREATE INDEX IF NOT EXISTS accounting_ledger_postings_organization_id_idx
	ON accounting_ledger_postings (organization_id);

CREATE TABLE IF NOT EXISTS accounting_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);