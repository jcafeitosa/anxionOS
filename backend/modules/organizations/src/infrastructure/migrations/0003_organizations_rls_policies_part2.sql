-- ANX-256: Second step - Apply Row Level Security policies to organizations tables
-- Requires: 0002_organizations_rls_policies_part1.sql (tenant_id/agency_id columns must exist)
--
-- Uses session variables from tenant-context.ts:
--   app.tenant_id   = current tenant UUID (set via SET LOCAL app.tenant_id = '...')
--   app.agency_id   = current agency UUID (set via SET LOCAL app.agency_id = '...')
--   app.bypass_rls  = 'true' to allow service role to bypass (set via SET LOCAL app.bypass_rls = 'true')
--
-- The service role 'anxion_service' is granted bypass when app.bypass_rls = 'true'.
-- Idempotent: drizzle may re-apply this file after shared __drizzle_migrations catch-up.

DO $$
DECLARE
	policy_row record;
BEGIN
	FOR policy_row IN
		SELECT policyname, tablename
		FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename LIKE 'organizations_%'
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
-- organizations_agencies
-- =====================================================
ALTER TABLE organizations_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_agencies FORCE ROW LEVEL SECURITY;

CREATE POLICY organizations_agencies_tenant_select
  ON organizations_agencies
  FOR SELECT
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY organizations_agencies_tenant_insert
  ON organizations_agencies
  FOR INSERT
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY organizations_agencies_tenant_update
  ON organizations_agencies
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

CREATE POLICY organizations_agencies_tenant_delete
  ON organizations_agencies
  FOR DELETE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- =====================================================
-- organizations_owners
-- =====================================================
ALTER TABLE organizations_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_owners FORCE ROW LEVEL SECURITY;

CREATE POLICY organizations_owners_tenant_select
  ON organizations_owners
  FOR SELECT
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY organizations_owners_tenant_insert
  ON organizations_owners
  FOR INSERT
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY organizations_owners_tenant_update
  ON organizations_owners
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

CREATE POLICY organizations_owners_tenant_delete
  ON organizations_owners
  FOR DELETE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- =====================================================
-- organizations_memberships
-- =====================================================
ALTER TABLE organizations_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY organizations_memberships_tenant_select
  ON organizations_memberships
  FOR SELECT
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY organizations_memberships_tenant_insert
  ON organizations_memberships
  FOR INSERT
  WITH CHECK (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

CREATE POLICY organizations_memberships_tenant_update
  ON organizations_memberships
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

CREATE POLICY organizations_memberships_tenant_delete
  ON organizations_memberships
  FOR DELETE
  USING (
    ((tenant_id::text = current_setting('app.tenant_id', true))
      AND (agency_id::text = current_setting('app.agency_id', true)))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );
