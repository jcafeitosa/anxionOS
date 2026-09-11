-- ANX-159 P08-S2: align simulation_runs with current domain model when an older
-- partial schema exists (CREATE TABLE IF NOT EXISTS in 0000 skips column adds).

ALTER TABLE simulation_runs
	ADD COLUMN IF NOT EXISTS manifest_id TEXT,
	ADD COLUMN IF NOT EXISTS isolation_flags JSONB,
	ADD COLUMN IF NOT EXISTS seed_hash TEXT,
	ADD COLUMN IF NOT EXISTS result_ref TEXT,
	ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1,
	ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS failure_code TEXT,
	ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'simulation_runs'
			AND column_name = 'sandbox_isolated'
	) THEN
		UPDATE simulation_runs
		SET isolation_flags = jsonb_build_object(
			'sandboxIsolated', COALESCE(sandbox_isolated, true),
			'promotionBlocked', COALESCE(promotion_blocked, true),
			'syntheticCredentialsOnly', COALESCE(synthetic_credentials_only, true),
			'isolatedSubgraph', COALESCE(isolated_subgraph, true)
		)
		WHERE isolation_flags IS NULL;
	END IF;
END
$$;

UPDATE simulation_runs
SET isolation_flags = '{"sandboxIsolated":true,"promotionBlocked":true,"syntheticCredentialsOnly":true,"isolatedSubgraph":true}'::jsonb
WHERE isolation_flags IS NULL;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'simulation_runs'
			AND column_name = 'isolation_flags'
			AND is_nullable = 'YES'
	) THEN
		ALTER TABLE simulation_runs
			ALTER COLUMN isolation_flags SET NOT NULL;
	END IF;
END
$$;

CREATE INDEX IF NOT EXISTS simulation_runs_organization_id_idx
	ON simulation_runs (organization_id);

CREATE INDEX IF NOT EXISTS simulation_runs_backtest_request_id_idx
	ON simulation_runs (backtest_request_id)
	WHERE backtest_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS simulation_runs_org_backtest_uidx
	ON simulation_runs (organization_id, backtest_request_id)
	WHERE backtest_request_id IS NOT NULL;
