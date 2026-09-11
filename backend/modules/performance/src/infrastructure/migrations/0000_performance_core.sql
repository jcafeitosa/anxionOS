-- performance module baseline schema (ANX-154 slice S1).
-- Tables align with repository SQL in persistence/repositories.ts.

CREATE TABLE IF NOT EXISTS performance_metric_definitions (
	id TEXT PRIMARY KEY,
	metric_code TEXT NOT NULL,
	version INTEGER NOT NULL,
	unit TEXT NOT NULL,
	description TEXT NOT NULL,
	formula_hash TEXT NOT NULL,
	published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS performance_metric_definitions_code_version_uidx
	ON performance_metric_definitions (metric_code, version);

CREATE TABLE IF NOT EXISTS performance_outcome_snapshots (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	journal_entry_id TEXT NOT NULL,
	value_date TEXT NOT NULL,
	lines_summary JSONB NOT NULL,
	recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS performance_outcome_snapshots_journal_entry_uidx
	ON performance_outcome_snapshots (journal_entry_id);

CREATE INDEX IF NOT EXISTS performance_outcome_snapshots_organization_id_idx
	ON performance_outcome_snapshots (organization_id);

CREATE TABLE IF NOT EXISTS performance_metric_series (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	outcome_snapshot_id TEXT NOT NULL REFERENCES performance_outcome_snapshots (id),
	metric_name TEXT NOT NULL,
	metric_value TEXT NOT NULL,
	observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS performance_metric_series_snapshot_metric_uidx
	ON performance_metric_series (outcome_snapshot_id, metric_name);

CREATE INDEX IF NOT EXISTS performance_metric_series_organization_id_idx
	ON performance_metric_series (organization_id);

CREATE TABLE IF NOT EXISTS performance_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	journal_entry_id TEXT,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS performance_command_journal_journal_entry_uidx
	ON performance_command_journal (journal_entry_id)
	WHERE journal_entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS performance_command_journal_organization_id_idx
	ON performance_command_journal (organization_id);

INSERT INTO performance_metric_definitions (
	id, metric_code, version, unit, description, formula_hash
) VALUES
	(
		'perf_def_cash_net_delta_v1',
		'pnl.cash_net_delta',
		1,
		'asset_amount',
		'Net cash movement from trading.cash ledger lines (debit minus credit).',
		'sha256:ledger-cash-net-v1'
	),
	(
		'perf_def_fees_total_v1',
		'pnl.fees_total',
		1,
		'asset_amount',
		'Total fees debited to trading.fees ledger lines.',
		'sha256:ledger-fees-sum-v1'
	),
	(
		'perf_def_notional_total_v1',
		'pnl.notional_total',
		1,
		'asset_amount',
		'Total notional from trading.clearing ledger line amounts.',
		'sha256:ledger-clearing-sum-v1'
	)
ON CONFLICT (id) DO NOTHING;
