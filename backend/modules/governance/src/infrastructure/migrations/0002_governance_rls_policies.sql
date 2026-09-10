-- ANX-256: Apply Row Level Security policies to governance tables
-- Requires: 0001_governance_rls_columns.sql (tenant_id/agency_id columns must exist)
-- Idempotent: ensureGovernanceSchema re-runs this file on every API boot.

DO $$
DECLARE
	policy_row record;
BEGIN
	FOR policy_row IN
		SELECT policyname, tablename
		FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename LIKE 'governance_%'
	LOOP
		EXECUTE format(
			'DROP POLICY IF EXISTS %I ON %I',
			policy_row.policyname,
			policy_row.tablename
		);
	END LOOP;
END
$$;

-- =====================================================
-- governance_grants
-- =====================================================
ALTER TABLE governance_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_grants FORCE ROW LEVEL SECURITY;

CREATE POLICY governance_grants_tenant_select
  ON governance_grants
  FOR SELECT
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_grants_tenant_insert
  ON governance_grants
  FOR INSERT
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_grants_tenant_update
  ON governance_grants
  FOR UPDATE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  )
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_grants_tenant_delete
  ON governance_grants
  FOR DELETE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- =====================================================
-- governance_change_proposals
-- =====================================================
ALTER TABLE governance_change_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_change_proposals FORCE ROW LEVEL SECURITY;

CREATE POLICY governance_change_proposals_tenant_select
  ON governance_change_proposals
  FOR SELECT
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_change_proposals_tenant_insert
  ON governance_change_proposals
  FOR INSERT
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_change_proposals_tenant_update
  ON governance_change_proposals
  FOR UPDATE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  )
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_change_proposals_tenant_delete
  ON governance_change_proposals
  FOR DELETE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- =====================================================
-- governance_approvals
-- =====================================================
ALTER TABLE governance_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_approvals FORCE ROW LEVEL SECURITY;

CREATE POLICY governance_approvals_tenant_select
  ON governance_approvals
  FOR SELECT
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_approvals_tenant_insert
  ON governance_approvals
  FOR INSERT
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_approvals_tenant_update
  ON governance_approvals
  FOR UPDATE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  )
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_approvals_tenant_delete
  ON governance_approvals
  FOR DELETE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- =====================================================
-- governance_authority_epochs
-- =====================================================
ALTER TABLE governance_authority_epochs ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_authority_epochs FORCE ROW LEVEL SECURITY;

CREATE POLICY governance_authority_epochs_tenant_select
  ON governance_authority_epochs
  FOR SELECT
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_authority_epochs_tenant_insert
  ON governance_authority_epochs
  FOR INSERT
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_authority_epochs_tenant_update
  ON governance_authority_epochs
  FOR UPDATE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  )
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY governance_authority_epochs_tenant_delete
  ON governance_authority_epochs
  FOR DELETE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );