-- ANX-159 P08-S2: repair partial 0000_simulation_core application.
-- Idempotent: safe when 0000 already created these objects.

CREATE TABLE IF NOT EXISTS simulation_manifests (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	fidelity_tier TEXT NOT NULL DEFAULT 'TIER_SIMULATED',
	dataset_hash TEXT NOT NULL,
	sandbox_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
	manifest_payload JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simulation_manifests_organization_id_idx
	ON simulation_manifests (organization_id);

CREATE TABLE IF NOT EXISTS simulation_snapshots (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	simulation_run_id TEXT NOT NULL REFERENCES simulation_runs (id),
	dataset_ref TEXT,
	dataset_hash TEXT NOT NULL,
	snapshot_payload JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simulation_snapshots_organization_id_idx
	ON simulation_snapshots (organization_id);

CREATE INDEX IF NOT EXISTS simulation_snapshots_run_id_idx
	ON simulation_snapshots (simulation_run_id);
