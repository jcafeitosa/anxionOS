-- ANX-154 S2: position-updated consumer storage (exposure snapshots + metric linkage).

CREATE TABLE IF NOT EXISTS performance_position_exposure_snapshots (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	portfolio_id TEXT NOT NULL,
	position_id TEXT NOT NULL,
	revision INTEGER NOT NULL,
	instrument_id TEXT NOT NULL,
	position_side TEXT NOT NULL,
	book TEXT NOT NULL,
	quantity TEXT NOT NULL,
	fill_id TEXT NOT NULL,
	side TEXT NOT NULL,
	provisional_cash BOOLEAN NOT NULL DEFAULT FALSE,
	observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS performance_position_exposure_snapshots_position_revision_uidx
	ON performance_position_exposure_snapshots (position_id, revision);

CREATE INDEX IF NOT EXISTS performance_position_exposure_snapshots_organization_id_idx
	ON performance_position_exposure_snapshots (organization_id);

CREATE INDEX IF NOT EXISTS performance_position_exposure_snapshots_position_revision_desc_idx
	ON performance_position_exposure_snapshots (position_id, revision DESC);

ALTER TABLE performance_metric_series
	ALTER COLUMN outcome_snapshot_id DROP NOT NULL;

ALTER TABLE performance_metric_series
	ADD COLUMN IF NOT EXISTS position_exposure_snapshot_id TEXT
	REFERENCES performance_position_exposure_snapshots (id);

CREATE UNIQUE INDEX IF NOT EXISTS performance_metric_series_position_metric_uidx
	ON performance_metric_series (position_exposure_snapshot_id, metric_name)
	WHERE position_exposure_snapshot_id IS NOT NULL;

ALTER TABLE performance_command_journal
	ADD COLUMN IF NOT EXISTS position_id TEXT;

ALTER TABLE performance_command_journal
	ADD COLUMN IF NOT EXISTS position_revision INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS performance_command_journal_position_revision_uidx
	ON performance_command_journal (position_id, position_revision)
	WHERE position_id IS NOT NULL;

INSERT INTO performance_metric_definitions (
	id, metric_code, version, unit, description, formula_hash
) VALUES
	(
		'perf_def_exposure_quantity_v1',
		'exposure.quantity',
		1,
		'asset_amount',
		'Absolute position quantity from portfolios.position.updated.v1.',
		'sha256:position-quantity-abs-v1'
	),
	(
		'perf_def_exposure_signed_quantity_v1',
		'exposure.signed_quantity',
		1,
		'asset_amount',
		'Signed position quantity (SHORT negated) from portfolios.position.updated.v1.',
		'sha256:position-quantity-signed-v1'
	),
	(
		'perf_def_exposure_provisional_cash_v1',
		'exposure.provisional_cash',
		1,
		'flag',
		'1 when position update carried provisionalCash, else 0.',
		'sha256:position-provisional-cash-v1'
	)
ON CONFLICT (id) DO NOTHING;
