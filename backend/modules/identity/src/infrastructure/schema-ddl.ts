export const IDENTITY_DDL = `
DO $$ BEGIN
 CREATE TYPE identity_principal_status AS ENUM ('active', 'suspended');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE identity_service_identity_status AS ENUM ('active', 'revoked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS identity_principals (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	auth_user_id TEXT NOT NULL UNIQUE,
	email TEXT NOT NULL UNIQUE,
	status identity_principal_status NOT NULL DEFAULT 'active',
	suspended_at TIMESTAMPTZ,
	suspension_reason TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity_service_identities (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	principal_id UUID NOT NULL REFERENCES identity_principals(id),
	label TEXT NOT NULL,
	status identity_service_identity_status NOT NULL DEFAULT 'active',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	revoked_at TIMESTAMPTZ
);
`;
