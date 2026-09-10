-- ANX-256: Add tenant_id/agency_id columns to governance tables
-- governance_grants keeps scope_id/scope_kind for business scope; explicit agency_id
-- provides a stable tenant container for RLS regardless of scope kind.

ALTER TABLE governance_grants
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS agency_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS governance_grants_tenant_id_idx ON governance_grants (tenant_id);
CREATE INDEX IF NOT EXISTS governance_grants_agency_id_idx ON governance_grants (agency_id);

ALTER TABLE governance_change_proposals
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS agency_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS governance_change_proposals_tenant_id_idx ON governance_change_proposals (tenant_id);
CREATE INDEX IF NOT EXISTS governance_change_proposals_agency_id_idx ON governance_change_proposals (agency_id);

ALTER TABLE governance_approvals
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS agency_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS governance_approvals_tenant_id_idx ON governance_approvals (tenant_id);
CREATE INDEX IF NOT EXISTS governance_approvals_agency_id_idx ON governance_approvals (agency_id);

ALTER TABLE governance_authority_epochs
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS agency_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS governance_authority_epochs_tenant_id_idx ON governance_authority_epochs (tenant_id);
CREATE INDEX IF NOT EXISTS governance_authority_epochs_agency_id_idx ON governance_authority_epochs (agency_id);
