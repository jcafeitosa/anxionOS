-- ANX-143 S8: governed skills, versions and agent-version bindings

DO $$ BEGIN
 CREATE TYPE agents_skill_version_status AS ENUM (
  'draft',
  'candidate',
  'verified',
  'rejected',
  'expired',
  'revoked'
 );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS agents_skills (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id UUID NOT NULL,
 organization_id UUID NOT NULL,
 agency_id UUID,
 slug TEXT NOT NULL,
 display_name TEXT NOT NULL,
 description TEXT,
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS agents_skills_tenant_org_slug_uidx
 ON agents_skills (tenant_id, organization_id, slug);
CREATE INDEX IF NOT EXISTS agents_skills_tenant_id_idx ON agents_skills (tenant_id);
CREATE INDEX IF NOT EXISTS agents_skills_organization_id_idx ON agents_skills (organization_id);
CREATE INDEX IF NOT EXISTS agents_skills_agency_id_idx ON agents_skills (agency_id);

CREATE TABLE IF NOT EXISTS agents_skill_versions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id UUID NOT NULL,
 skill_id UUID NOT NULL REFERENCES agents_skills (id),
 version_number INTEGER NOT NULL,
 status agents_skill_version_status NOT NULL DEFAULT 'draft',
 schema_version TEXT NOT NULL,
 content_ref JSONB NOT NULL,
 content_hash TEXT NOT NULL,
 permission_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
 sandbox_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
 evaluation_ref JSONB,
 promoted_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS agents_skill_versions_skill_version_uidx
 ON agents_skill_versions (skill_id, version_number);
CREATE INDEX IF NOT EXISTS agents_skill_versions_tenant_id_idx ON agents_skill_versions (tenant_id);
CREATE INDEX IF NOT EXISTS agents_skill_versions_skill_id_idx ON agents_skill_versions (skill_id);
CREATE INDEX IF NOT EXISTS agents_skill_versions_status_idx ON agents_skill_versions (status);

CREATE TABLE IF NOT EXISTS agents_agent_skill_bindings (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id UUID NOT NULL,
 agent_version_id UUID NOT NULL REFERENCES agents_agent_versions (id),
 skill_version_id UUID NOT NULL REFERENCES agents_skill_versions (id),
 binding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS agents_agent_skill_bindings_version_skill_uidx
 ON agents_agent_skill_bindings (agent_version_id, skill_version_id);
CREATE INDEX IF NOT EXISTS agents_agent_skill_bindings_tenant_id_idx
 ON agents_agent_skill_bindings (tenant_id);
CREATE INDEX IF NOT EXISTS agents_agent_skill_bindings_agent_version_id_idx
 ON agents_agent_skill_bindings (agent_version_id);
CREATE INDEX IF NOT EXISTS agents_agent_skill_bindings_skill_version_id_idx
 ON agents_agent_skill_bindings (skill_version_id);
