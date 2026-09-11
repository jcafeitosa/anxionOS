-- ANX-153 S4: ledger cash reconcile, provisional cash, PositionReconciliationCase.

CREATE TABLE IF NOT EXISTS portfolios_provisional_cash (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	portfolio_id TEXT NOT NULL REFERENCES portfolios_portfolios (id),
	fill_id TEXT NOT NULL,
	cash_delta NUMERIC NOT NULL,
	asset TEXT NOT NULL,
	settled BOOLEAN NOT NULL DEFAULT FALSE,
	journal_entry_id TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolios_provisional_cash_org_fill_uidx
	ON portfolios_provisional_cash (organization_id, fill_id);

CREATE INDEX IF NOT EXISTS portfolios_provisional_cash_portfolio_id_idx
	ON portfolios_provisional_cash (portfolio_id);

CREATE TABLE IF NOT EXISTS portfolios_ledger_applications (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	portfolio_id TEXT NOT NULL REFERENCES portfolios_portfolios (id),
	journal_entry_id TEXT NOT NULL,
	cash_delta NUMERIC NOT NULL,
	asset TEXT NOT NULL,
	fill_id TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolios_ledger_applications_org_journal_uidx
	ON portfolios_ledger_applications (organization_id, journal_entry_id);

CREATE INDEX IF NOT EXISTS portfolios_ledger_applications_portfolio_id_idx
	ON portfolios_ledger_applications (portfolio_id);

CREATE TABLE IF NOT EXISTS portfolios_position_reconciliation_cases (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	portfolio_id TEXT NOT NULL REFERENCES portfolios_portfolios (id),
	position_id TEXT REFERENCES portfolios_positions (id),
	case_kind TEXT NOT NULL CHECK (
		case_kind IN ('POSITION_VS_FILL', 'POSITION_VS_LEDGER', 'VALUATION_STALE')
	),
	status TEXT NOT NULL CHECK (
		status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'ESCALATED')
	),
	fill_id TEXT,
	journal_entry_id TEXT,
	evidence TEXT,
	disposition TEXT,
	disposition_rationale TEXT,
	opened_at TIMESTAMPTZ NOT NULL,
	resolved_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolios_position_reconciliation_cases_organization_id_idx
	ON portfolios_position_reconciliation_cases (organization_id);

CREATE INDEX IF NOT EXISTS portfolios_position_reconciliation_cases_portfolio_id_idx
	ON portfolios_position_reconciliation_cases (portfolio_id);

CREATE INDEX IF NOT EXISTS portfolios_position_reconciliation_cases_fill_id_idx
	ON portfolios_position_reconciliation_cases (fill_id)
	WHERE fill_id IS NOT NULL;
