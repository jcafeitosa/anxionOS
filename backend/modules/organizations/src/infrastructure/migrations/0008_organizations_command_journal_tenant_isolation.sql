-- ANX-480: Add tenant_id to organizations_command_journal and apply RLS
--
-- Problem: Idempotency-Key was a global namespace without tenant isolation,
-- allowing cross-tenant collisions and information leakage (command names).
--
-- Solution: Add tenant_id column + RLS policies to isolate journal entries
-- per tenant, ensuring Idempotency-Key namespaces are tenant-scoped.
--
-- Requires: Same session variables as other organizations RLS policies:
--   app.tenant_id   = current tenant UUID
--   app.agency_id   = current agency UUID (not used for journal, but context sets both)
--   app.bypass_rls  = 'true' to allow service role bypass

-- Step 1: Add tenant_id column
ALTER TABLE organizations_command_journal
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid();

-- Step 2: Create index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS organizations_command_journal_tenant_id_idx
  ON organizations_command_journal (tenant_id);

-- Step 3: Enable RLS
ALTER TABLE organizations_command_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_command_journal FORCE ROW LEVEL SECURITY;

-- Step 4: RLS policies - SELECT
CREATE POLICY organizations_command_journal_tenant_select
  ON organizations_command_journal
  FOR SELECT
  USING (
    (tenant_id::text = current_setting('app.tenant_id', true))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- Step 5: RLS policies - INSERT
CREATE POLICY organizations_command_journal_tenant_insert
  ON organizations_command_journal
  FOR INSERT
  WITH CHECK (
    (tenant_id::text = current_setting('app.tenant_id', true))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- Step 6: RLS policies - UPDATE (journal is append-only, but complete for consistency)
CREATE POLICY organizations_command_journal_tenant_update
  ON organizations_command_journal
  FOR UPDATE
  USING (
    (tenant_id::text = current_setting('app.tenant_id', true))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  )
  WITH CHECK (
    (tenant_id::text = current_setting('app.tenant_id', true))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- Step 7: RLS policies - DELETE (journal is append-only, but complete for consistency)
CREATE POLICY organizations_command_journal_tenant_delete
  ON organizations_command_journal
  FOR DELETE
  USING (
    (tenant_id::text = current_setting('app.tenant_id', true))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );
