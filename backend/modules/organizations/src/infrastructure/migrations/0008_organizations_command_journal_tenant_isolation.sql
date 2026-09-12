-- ANX-480: Add tenant_id to organizations_command_journal and apply RLS
--
-- Problem: Idempotency-Key was a global namespace without tenant isolation,
-- allowing cross-tenant collisions and information leakage (command names).
--
-- Solution: Add tenant_id column + composite PK (tenant_id, command_id) + RLS
-- to isolate journal entries per tenant, ensuring Idempotency-Key namespaces
-- are tenant-scoped.
--
-- Red Team (Davi) requirements:
-- 1. Composite PK (tenant_id, command_id) — not just command_id
-- 2. onConflict must target the composite key
-- 3. No gen_random_uuid() default — migration fails if tenant_id is missing
--
-- Requires: Same session variables as other organizations RLS policies:
--   app.tenant_id   = current tenant UUID
--   app.agency_id   = current agency UUID (not used for journal, but context sets both)
--   app.bypass_rls  = 'true' to allow service role bypass

-- Step 1: Drop existing primary key
ALTER TABLE organizations_command_journal
  DROP CONSTRAINT IF EXISTS organizations_command_journal_pkey;

-- Step 2: Add tenant_id column (NOT NULL, no default — application must provide)
-- If there are existing rows without tenant_id, this will fail by design:
-- old rows must be cleaned or migrated with explicit tenant_id before this runs.
ALTER TABLE organizations_command_journal
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;

-- Step 3: Create composite primary key (tenant_id, command_id)
-- This ensures command_id is unique PER TENANT, not globally
ALTER TABLE organizations_command_journal
  ADD CONSTRAINT organizations_command_journal_pkey
  PRIMARY KEY (tenant_id, command_id);

-- Step 4: Create index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS organizations_command_journal_tenant_id_idx
  ON organizations_command_journal (tenant_id);

-- Step 5: Enable RLS
ALTER TABLE organizations_command_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_command_journal FORCE ROW LEVEL SECURITY;

-- Step 6: RLS policies - SELECT
CREATE POLICY organizations_command_journal_tenant_select
  ON organizations_command_journal
  FOR SELECT
  USING (
    (tenant_id::text = current_setting('app.tenant_id', true))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- Step 7: RLS policies - INSERT
CREATE POLICY organizations_command_journal_tenant_insert
  ON organizations_command_journal
  FOR INSERT
  WITH CHECK (
    (tenant_id::text = current_setting('app.tenant_id', true))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- Step 8: RLS policies - UPDATE (journal is append-only, but complete for consistency)
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

-- Step 9: RLS policies - DELETE (journal is append-only, but complete for consistency)
CREATE POLICY organizations_command_journal_tenant_delete
  ON organizations_command_journal
  FOR DELETE
  USING (
    (tenant_id::text = current_setting('app.tenant_id', true))
    OR (current_setting('app.bypass_rls', true) = 'true'
        AND pg_has_role(current_user, 'anxion_service', 'member'))
  );

-- Note on backfill:
-- If pre-existing rows exist in organizations_command_journal without tenant_id,
-- this migration will FAIL at Step 2 (NOT NULL without default).
-- This is intentional: old rows must be explicitly migrated or cleaned before applying.
-- In dev/test environments, TRUNCATE organizations_command_journal may be acceptable.
-- In production (if any), map command_id → tenant_id via aggregate_id join before running.
