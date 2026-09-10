-- ANX-256: First step - Add tenant_id and agency_id columns to critical tables
--
-- This migration adds the tenant_id and agency_id columns required for multi-tenant
-- isolation via Row Level Security. The default gen_random_uuid() only exists so that
-- pre-existing dev rows do not violate NOT NULL; the application layer (tenant-context.ts /
-- scoped-pool.ts) must always supply explicit tenant_id/agency_id on writes going forward.
-- RLS policies themselves are created in 0003_organizations_rls_policies_part2.sql, after
-- these columns exist on every table.

-- organizations_agencies
ALTER TABLE organizations_agencies
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS agency_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS organizations_agencies_tenant_id_idx
  ON organizations_agencies (tenant_id);
CREATE INDEX IF NOT EXISTS organizations_agencies_agency_id_idx
  ON organizations_agencies (agency_id);

-- organizations_owners
ALTER TABLE organizations_owners
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS agency_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS organizations_owners_tenant_id_idx
  ON organizations_owners (tenant_id);
CREATE INDEX IF NOT EXISTS organizations_owners_agency_id_idx
  ON organizations_owners (agency_id);

-- organizations_memberships (agency_id already exists from 0000; add tenant_id only)
ALTER TABLE organizations_memberships
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS organizations_memberships_tenant_id_idx
  ON organizations_memberships (tenant_id);
