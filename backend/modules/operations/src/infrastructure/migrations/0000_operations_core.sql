-- operations module baseline schema (ANX-158/ANX-310/ANX-311)
CREATE TABLE IF NOT EXISTS operations_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	response_snapshot JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operations_command_journal_organization_id_idx
	ON operations_command_journal (organization_id);

CREATE TABLE IF NOT EXISTS operations_health_checks (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	service_id TEXT NOT NULL,
	status TEXT NOT NULL,
	probe_details JSONB,
	checked_at TIMESTAMPTZ NOT NULL,
	revision INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS operations_health_checks_org_service_uidx
	ON operations_health_checks (organization_id, service_id);
CREATE INDEX IF NOT EXISTS operations_health_checks_organization_id_idx
	ON operations_health_checks (organization_id);
CREATE INDEX IF NOT EXISTS operations_health_checks_status_idx
	ON operations_health_checks (status);

CREATE TABLE IF NOT EXISTS operations_incidents (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	title TEXT NOT NULL,
	description TEXT,
	severity TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'OPEN',
	service_id TEXT,
	opened_at TIMESTAMPTZ NOT NULL,
	revision INTEGER NOT NULL DEFAULT 1,
	runbook_id TEXT,
	runbook_version TEXT,
	runbook_attached_at TIMESTAMPTZ,
	responsible_principal_id UUID,
	resolved_at TIMESTAMPTZ,
	closed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operations_incidents_organization_id_idx
	ON operations_incidents (organization_id);
CREATE INDEX IF NOT EXISTS operations_incidents_status_idx
	ON operations_incidents (status);
CREATE INDEX IF NOT EXISTS operations_incidents_service_id_idx
	ON operations_incidents (service_id);
