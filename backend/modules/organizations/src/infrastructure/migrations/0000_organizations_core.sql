-- organizations module baseline schema
DO $$ BEGIN
 CREATE TYPE organizations_agency_status AS ENUM (
  'draft', 'connections_pending', 'ready', 'draining', 'archived'
 );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE organizations_market_scope AS ENUM ('stocks', 'crypto', 'both');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE organizations_onboarding_step AS ENUM (
  'created', 'markets_set', 'blueprint_pending', 'mandate_pending', 'ready'
 );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE organizations_membership_role AS ENUM (
  'owner', 'admin', 'operator', 'viewer'
 );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE organizations_membership_status AS ENUM ('invited', 'active', 'revoked');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS organizations_agencies (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_principal_id UUID NOT NULL,
 display_name TEXT NOT NULL,
 market_scope organizations_market_scope NOT NULL,
 status organizations_agency_status NOT NULL DEFAULT 'draft',
 onboarding_step organizations_onboarding_step NOT NULL DEFAULT 'created',
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organizations_agencies_owner_principal_id_idx
 ON organizations_agencies (owner_principal_id);
CREATE INDEX IF NOT EXISTS organizations_agencies_status_idx
 ON organizations_agencies (status);

CREATE TABLE IF NOT EXISTS organizations_owners (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 principal_id UUID NOT NULL,
 default_organization_id UUID,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS organizations_owners_principal_id_unique
 ON organizations_owners (principal_id);

CREATE TABLE IF NOT EXISTS organizations_memberships (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 agency_id UUID NOT NULL,
 principal_id UUID,
 invite_email TEXT,
 invite_token_hash TEXT,
 invite_expires_at TIMESTAMPTZ,
 role organizations_membership_role NOT NULL,
 status organizations_membership_status NOT NULL,
 invited_at TIMESTAMPTZ,
 joined_at TIMESTAMPTZ,
 revoked_at TIMESTAMPTZ,
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organizations_memberships_agency_id_idx
 ON organizations_memberships (agency_id);
CREATE INDEX IF NOT EXISTS organizations_memberships_principal_id_idx
 ON organizations_memberships (principal_id)
 WHERE principal_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS organizations_command_journal (
 command_id UUID PRIMARY KEY,
 command_name TEXT NOT NULL,
 aggregate_id UUID NOT NULL,
 aggregate_type TEXT NOT NULL,
 revision INTEGER NOT NULL,
 response_snapshot JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
