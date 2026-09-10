DO $$ BEGIN
  CREATE TYPE governance_autonomy_level AS ENUM ('L0', 'L1', 'L2', 'L3', 'L4');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE governance_autonomy_assignment_status AS ENUM ('active', 'superseded', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS governance_autonomy_assignments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  agency_id UUID NOT NULL,
  scope_id UUID NOT NULL,
  subject_agent_id UUID NOT NULL,
  level governance_autonomy_level NOT NULL,
  status governance_autonomy_assignment_status NOT NULL DEFAULT 'active',
  evidence_hash TEXT,
  approval_id UUID,
  authority_epoch_at_assignment INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS governance_autonomy_assignments_tenant_id_idx
  ON governance_autonomy_assignments (tenant_id);
CREATE INDEX IF NOT EXISTS governance_autonomy_assignments_agency_id_idx
  ON governance_autonomy_assignments (agency_id);
CREATE INDEX IF NOT EXISTS governance_autonomy_assignments_scope_id_idx
  ON governance_autonomy_assignments (scope_id);
CREATE INDEX IF NOT EXISTS governance_autonomy_assignments_subject_agent_id_idx
  ON governance_autonomy_assignments (subject_agent_id);
CREATE INDEX IF NOT EXISTS governance_autonomy_assignments_status_idx
  ON governance_autonomy_assignments (status);
