CREATE TYPE governance_mandate_kind AS ENUM ('ceo', 'operator', 'audit');
CREATE TYPE governance_mandate_status AS ENUM ('active', 'suspended', 'revoked');

CREATE TABLE IF NOT EXISTS governance_mandates (
	id uuid PRIMARY KEY,
	tenant_id uuid NOT NULL,
	agency_id uuid NOT NULL,
	agent_id uuid NOT NULL,
	grant_id uuid NOT NULL,
	mandate_kind governance_mandate_kind NOT NULL,
	status governance_mandate_status NOT NULL DEFAULT 'active',
	revision integer NOT NULL DEFAULT 1,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS governance_mandates_tenant_id_idx
	ON governance_mandates (tenant_id);
CREATE INDEX IF NOT EXISTS governance_mandates_agency_id_idx
	ON governance_mandates (agency_id);
CREATE INDEX IF NOT EXISTS governance_mandates_agent_id_idx
	ON governance_mandates (agent_id);
CREATE INDEX IF NOT EXISTS governance_mandates_grant_id_idx
	ON governance_mandates (grant_id);
