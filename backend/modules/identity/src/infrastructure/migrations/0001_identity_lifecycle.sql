-- identity lifecycle: kind + revision + revoked, session refs, service
-- credentials and the command idempotency ledger (R03/R04).
-- Idempotent: safe to re-apply on a database bootstrapped by the raw 0000 DDL.

DO $$ BEGIN
 CREATE TYPE identity_principal_kind AS ENUM ('human', 'service');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE identity_session_ref_status AS ENUM ('active', 'revoked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE identity_service_credential_status AS ENUM ('active', 'rotated', 'revoked', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- REVOKED is terminal. Additive only: no row uses the value in this migration.
ALTER TYPE identity_principal_status ADD VALUE IF NOT EXISTS 'revoked';

-- Service principals hold no Better Auth session, so auth_user_id is nullable.
ALTER TABLE identity_principals ALTER COLUMN auth_user_id DROP NOT NULL;
ALTER TABLE identity_principals
 ADD COLUMN IF NOT EXISTS kind identity_principal_kind NOT NULL DEFAULT 'human';
ALTER TABLE identity_principals
 ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE identity_principals
 ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE identity_principals
 ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

CREATE TABLE IF NOT EXISTS identity_sessions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 principal_id UUID NOT NULL REFERENCES identity_principals(id),
 status identity_session_ref_status NOT NULL DEFAULT 'active',
 external_ref_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 revoked_at TIMESTAMPTZ,
 revocation_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS identity_sessions_external_ref_hash_idx
 ON identity_sessions (external_ref_hash);

CREATE TABLE IF NOT EXISTS identity_service_credentials (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 service_identity_id UUID NOT NULL REFERENCES identity_service_identities(id),
 prefix TEXT NOT NULL,
 secret_hash TEXT NOT NULL,
 status identity_service_credential_status NOT NULL DEFAULT 'active',
 issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ,
 rotated_at TIMESTAMPTZ,
 rotated_to_id UUID,
 revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS identity_service_credentials_prefix_idx
 ON identity_service_credentials (prefix);

CREATE TABLE IF NOT EXISTS identity_command_journal (
 command_id UUID PRIMARY KEY,
 command_name TEXT NOT NULL,
 aggregate_id UUID NOT NULL,
 aggregate_type TEXT NOT NULL,
 revision INTEGER NOT NULL,
 response_snapshot JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
