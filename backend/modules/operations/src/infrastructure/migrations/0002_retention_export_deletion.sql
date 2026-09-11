-- operations retention/export/deletion (ANX-313 S3)
CREATE TABLE IF NOT EXISTS operations_retention_policies (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	scope TEXT NOT NULL,
	action TEXT NOT NULL,
	retention_days INTEGER NOT NULL,
	legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
	export_manifest_required BOOLEAN NOT NULL DEFAULT FALSE,
	created_by UUID NOT NULL,
	status TEXT NOT NULL DEFAULT 'ACTIVE',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operations_retention_policies_org_scope_idx
	ON operations_retention_policies (organization_id, scope);
CREATE INDEX IF NOT EXISTS operations_retention_policies_status_idx
	ON operations_retention_policies (status);

CREATE TABLE IF NOT EXISTS operations_export_jobs (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	scope TEXT NOT NULL,
	subject_id TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'REQUESTED',
	manifest_json JSONB,
	requested_by UUID NOT NULL,
	completed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operations_export_jobs_org_subject_idx
	ON operations_export_jobs (organization_id, subject_id);
CREATE INDEX IF NOT EXISTS operations_export_jobs_status_idx
	ON operations_export_jobs (status);

CREATE TABLE IF NOT EXISTS operations_deletion_requests (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	scope TEXT NOT NULL,
	subject_id TEXT NOT NULL,
	policy_id TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'REQUESTED',
	requested_by UUID NOT NULL,
	approved_by UUID,
	approved_at TIMESTAMPTZ,
	executed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operations_deletion_requests_org_subject_idx
	ON operations_deletion_requests (organization_id, subject_id);
CREATE INDEX IF NOT EXISTS operations_deletion_requests_status_idx
	ON operations_deletion_requests (status);