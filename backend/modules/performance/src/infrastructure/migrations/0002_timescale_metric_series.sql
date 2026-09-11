-- ANX-154 S4: Timescale read-model hypertables (derived from performance_metric_series).
-- Authoritative snapshot/metric state remains in PostgreSQL performance_* tables (PERF-R05-01).

CREATE TABLE IF NOT EXISTS performance_metric_points (
	observed_at TIMESTAMPTZ NOT NULL,
	organization_id UUID NOT NULL,
	metric_series_id TEXT NOT NULL,
	metric_name TEXT NOT NULL,
	metric_value TEXT NOT NULL,
	outcome_snapshot_id TEXT,
	position_exposure_snapshot_id TEXT,
	portfolio_id TEXT,
	position_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS performance_metric_points_series_uidx
	ON performance_metric_points (metric_series_id, observed_at);

CREATE INDEX IF NOT EXISTS performance_metric_points_org_time_idx
	ON performance_metric_points (organization_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS performance_metric_points_org_metric_time_idx
	ON performance_metric_points (organization_id, metric_name, observed_at DESC);

SELECT create_hypertable(
	'performance_metric_points',
	'observed_at',
	if_not_exists => TRUE,
	migrate_data => TRUE
);

CREATE TABLE IF NOT EXISTS performance_pnl_series (
	observed_at TIMESTAMPTZ NOT NULL,
	organization_id UUID NOT NULL,
	metric_series_id TEXT NOT NULL,
	outcome_snapshot_id TEXT NOT NULL,
	journal_entry_id TEXT NOT NULL,
	metric_name TEXT NOT NULL,
	metric_value TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS performance_pnl_series_series_uidx
	ON performance_pnl_series (metric_series_id, observed_at);

CREATE INDEX IF NOT EXISTS performance_pnl_series_org_time_idx
	ON performance_pnl_series (organization_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS performance_pnl_series_org_journal_idx
	ON performance_pnl_series (organization_id, journal_entry_id, observed_at DESC);

SELECT create_hypertable(
	'performance_pnl_series',
	'observed_at',
	if_not_exists => TRUE,
	migrate_data => TRUE
);
