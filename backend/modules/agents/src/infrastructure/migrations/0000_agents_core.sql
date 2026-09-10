-- agents module baseline schema
DO $$ BEGIN
 CREATE TYPE agents_agent_kind AS ENUM ('AGENCY', 'PLATFORM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE agents_lifecycle_status AS ENUM (
  'DRAFT', 'CONFIGURED', 'READY', 'ACTIVE', 'PAUSED', 'DRAINING', 'ARCHIVED'
 );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE agents_version_status AS ENUM ('draft', 'published', 'deprecated');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE agents_autonomy_level AS ENUM ('L0', 'L1', 'L2', 'L3', 'L4');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS agents_agents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id UUID NOT NULL,
 organization_id UUID NOT NULL,
 agency_id UUID,
 kind agents_agent_kind NOT NULL,
 display_name TEXT NOT NULL,
 status agents_lifecycle_status NOT NULL DEFAULT 'DRAFT',
 active_version_id UUID,
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agents_agents_tenant_id_idx ON agents_agents (tenant_id);
CREATE INDEX IF NOT EXISTS agents_agents_organization_id_idx ON agents_agents (organization_id);
CREATE INDEX IF NOT EXISTS agents_agents_agency_id_idx ON agents_agents (agency_id);
CREATE INDEX IF NOT EXISTS agents_agents_status_idx ON agents_agents (status);

CREATE TABLE IF NOT EXISTS agents_agent_versions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id UUID NOT NULL,
 agent_id UUID NOT NULL,
 version_number INTEGER NOT NULL,
 status agents_version_status NOT NULL DEFAULT 'draft',
 instruction_ref JSONB NOT NULL,
 skill_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
 capability_manifest_hash TEXT NOT NULL,
 model_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
 autonomy_level agents_autonomy_level NOT NULL,
 published_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS agents_agent_versions_agent_version_uidx
 ON agents_agent_versions (agent_id, version_number);
CREATE INDEX IF NOT EXISTS agents_agent_versions_tenant_id_idx ON agents_agent_versions (tenant_id);
CREATE INDEX IF NOT EXISTS agents_agent_versions_agent_id_idx ON agents_agent_versions (agent_id);

CREATE TABLE IF NOT EXISTS agents_command_journal (
 command_id UUID PRIMARY KEY,
 command_name TEXT NOT NULL,
 aggregate_id UUID NOT NULL,
 aggregate_type TEXT NOT NULL,
 revision INTEGER NOT NULL,
 response_snapshot JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
