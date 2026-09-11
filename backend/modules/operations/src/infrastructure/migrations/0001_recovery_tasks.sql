-- operations recovery tasks (ANX-158 S4b)
CREATE TABLE IF NOT EXISTS operations_recovery_tasks (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	incident_id TEXT NOT NULL,
	step_kind TEXT NOT NULL,
	status TEXT NOT NULL,
	step_requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
	has_required_approval BOOLEAN NOT NULL DEFAULT FALSE,
	started_at TIMESTAMPTZ NOT NULL,
	revision INTEGER NOT NULL DEFAULT 1,
	initiated_by_principal_id UUID,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operations_recovery_tasks_organization_id_idx
	ON operations_recovery_tasks (organization_id);
CREATE INDEX IF NOT EXISTS operations_recovery_tasks_incident_id_idx
	ON operations_recovery_tasks (incident_id);
CREATE INDEX IF NOT EXISTS operations_recovery_tasks_status_idx
	ON operations_recovery_tasks (status);
CREATE INDEX IF NOT EXISTS operations_recovery_tasks_step_kind_idx
	ON operations_recovery_tasks (step_kind);
