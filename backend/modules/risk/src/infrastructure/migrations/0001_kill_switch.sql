-- risk kill switch state (ANX-150 slice S3).

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_kill_switch_scope') THEN
		CREATE TYPE risk_kill_switch_scope AS ENUM ('ORGANIZATION', 'PORTFOLIO');
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS risk_kill_switch_state (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	scope risk_kill_switch_scope NOT NULL,
	portfolio_id TEXT,
	reason TEXT NOT NULL,
	activated_by TEXT NOT NULL,
	risk_epoch_at_activation INTEGER NOT NULL,
	active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	released_at TIMESTAMPTZ,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS risk_kill_switch_state_organization_id_idx
	ON risk_kill_switch_state (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS risk_kill_switch_state_org_scope_active_uidx
	ON risk_kill_switch_state (
		organization_id,
		scope,
		COALESCE(portfolio_id, '')
	)
	WHERE active = TRUE;
