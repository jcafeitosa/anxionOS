-- portfolios valuation snapshots (ANX-153 slice S3).

CREATE TABLE IF NOT EXISTS portfolios_valuation_snapshots (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	portfolio_id TEXT NOT NULL REFERENCES portfolios_portfolios (id),
	as_of TIMESTAMPTZ NOT NULL,
	valuation_version INTEGER NOT NULL DEFAULT 1,
	status TEXT NOT NULL CHECK (status IN ('DRAFT', 'CONFIRMED', 'SUPERSEDED')),
	price_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
	fx_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
	nav_base NUMERIC NOT NULL,
	nav_components_json JSONB NOT NULL DEFAULT '{}'::jsonb,
	quality_flags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolios_valuation_snapshots_portfolio_asof_ver_uidx
	ON portfolios_valuation_snapshots (portfolio_id, as_of, valuation_version);

CREATE INDEX IF NOT EXISTS portfolios_valuation_snapshots_organization_id_idx
	ON portfolios_valuation_snapshots (organization_id);
