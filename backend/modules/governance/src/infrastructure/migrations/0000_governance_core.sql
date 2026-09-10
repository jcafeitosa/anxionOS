-- governance module baseline schema

DO $$ BEGIN
 CREATE TYPE governance_scope_kind AS ENUM ('agency', 'organization');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE governance_grant_status AS ENUM ('active', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE governance_change_proposal_kind AS ENUM (
  'SOFTWARE', 'INSTITUTIONAL', 'HIERARCHY_MODE'
 );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE governance_change_proposal_status AS ENUM (
  'pending', 'approved', 'rejected', 'superseded'
 );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE governance_approval_decision AS ENUM ('APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS governance_grants (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 scope_id UUID NOT NULL,
 scope_kind governance_scope_kind NOT NULL,
 grantee_principal_id UUID NOT NULL,
 grantee_agent_id UUID,
 capability TEXT NOT NULL,
 resource_ref TEXT,
 status governance_grant_status NOT NULL DEFAULT 'active',
 valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 valid_until TIMESTAMPTZ,
 derived_from_membership_id UUID,
 authority_epoch_at_issue INTEGER NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS governance_grants_scope_id_idx
 ON governance_grants (scope_id);
CREATE INDEX IF NOT EXISTS governance_grants_grantee_principal_id_idx
 ON governance_grants (grantee_principal_id);
CREATE INDEX IF NOT EXISTS governance_grants_status_idx
 ON governance_grants (status);
CREATE INDEX IF NOT EXISTS governance_grants_derived_from_membership_id_idx
 ON governance_grants (derived_from_membership_id);

CREATE TABLE IF NOT EXISTS governance_change_proposals (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 scope_id UUID NOT NULL,
 kind governance_change_proposal_kind NOT NULL,
 payload_hash TEXT NOT NULL,
 proposer_principal_id UUID NOT NULL,
 status governance_change_proposal_status NOT NULL DEFAULT 'pending',
 required_approvals INTEGER NOT NULL DEFAULT 1,
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS governance_change_proposals_scope_id_idx
 ON governance_change_proposals (scope_id);
CREATE INDEX IF NOT EXISTS governance_change_proposals_status_idx
 ON governance_change_proposals (status);

CREATE TABLE IF NOT EXISTS governance_approvals (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 change_proposal_id UUID NOT NULL,
 action_ref TEXT,
 resolver_principal_id UUID NOT NULL,
 decision governance_approval_decision NOT NULL,
 reason TEXT,
 resolved_at TIMESTAMPTZ NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS governance_approvals_change_proposal_id_idx
 ON governance_approvals (change_proposal_id);

CREATE TABLE IF NOT EXISTS governance_authority_epochs (
 scope_id UUID PRIMARY KEY,
 epoch INTEGER NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_command_journal (
 command_id UUID PRIMARY KEY,
 command_name TEXT NOT NULL,
 aggregate_id UUID NOT NULL,
 aggregate_type TEXT NOT NULL,
 revision INTEGER NOT NULL,
 response_snapshot JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
