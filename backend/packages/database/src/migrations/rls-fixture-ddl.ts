export const RLS_FIXTURE_UP_SQL = `
CREATE TABLE IF NOT EXISTS anxionos_tenant_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS anxionos_tenant_records_tenant_idx
  ON anxionos_tenant_records (tenant_id);

ALTER TABLE anxionos_tenant_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE anxionos_tenant_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anxionos_tenant_records_tenant_select ON anxionos_tenant_records;
DROP POLICY IF EXISTS anxionos_tenant_records_tenant_insert ON anxionos_tenant_records;
DROP POLICY IF EXISTS anxionos_tenant_records_tenant_update ON anxionos_tenant_records;
DROP POLICY IF EXISTS anxionos_tenant_records_tenant_delete ON anxionos_tenant_records;

CREATE POLICY anxionos_tenant_records_tenant_select ON anxionos_tenant_records
  FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    OR (
      current_setting('app.bypass_rls', true) = 'true'
      AND pg_has_role(current_user, 'anxion_service', 'member')
    )
  );

CREATE POLICY anxionos_tenant_records_tenant_insert ON anxionos_tenant_records
  FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    OR (
      current_setting('app.bypass_rls', true) = 'true'
      AND pg_has_role(current_user, 'anxion_service', 'member')
    )
  );

CREATE POLICY anxionos_tenant_records_tenant_update ON anxionos_tenant_records
  FOR UPDATE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    OR (
      current_setting('app.bypass_rls', true) = 'true'
      AND pg_has_role(current_user, 'anxion_service', 'member')
    )
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    OR (
      current_setting('app.bypass_rls', true) = 'true'
      AND pg_has_role(current_user, 'anxion_service', 'member')
    )
  );

CREATE POLICY anxionos_tenant_records_tenant_delete ON anxionos_tenant_records
  FOR DELETE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    OR (
      current_setting('app.bypass_rls', true) = 'true'
      AND pg_has_role(current_user, 'anxion_service', 'member')
    )
  );
`.trim();

export const RLS_FIXTURE_DOWN_SQL = `
DROP POLICY IF EXISTS anxionos_tenant_records_tenant_delete ON anxionos_tenant_records;
DROP POLICY IF EXISTS anxionos_tenant_records_tenant_update ON anxionos_tenant_records;
DROP POLICY IF EXISTS anxionos_tenant_records_tenant_insert ON anxionos_tenant_records;
DROP POLICY IF EXISTS anxionos_tenant_records_tenant_select ON anxionos_tenant_records;

ALTER TABLE IF EXISTS anxionos_tenant_records DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS anxionos_tenant_records;
`.trim();
