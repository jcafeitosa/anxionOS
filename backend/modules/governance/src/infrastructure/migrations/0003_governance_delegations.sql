CREATE TABLE IF NOT EXISTS governance_delegations (
	id uuid PRIMARY KEY,
	tenant_id uuid NOT NULL,
	agency_id uuid NOT NULL,
	parent_grant_id uuid NOT NULL,
	delegate_principal_id uuid NOT NULL,
	capability_subset jsonb NOT NULL,
	intent_hash text,
	valid_until timestamptz NOT NULL,
	status governance_grant_status NOT NULL DEFAULT 'active',
	revision integer NOT NULL DEFAULT 1,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS governance_delegations_tenant_id_idx
	ON governance_delegations (tenant_id);
CREATE INDEX IF NOT EXISTS governance_delegations_agency_id_idx
	ON governance_delegations (agency_id);
CREATE INDEX IF NOT EXISTS governance_delegations_parent_grant_id_idx
	ON governance_delegations (parent_grant_id);
CREATE INDEX IF NOT EXISTS governance_delegations_delegate_principal_id_idx
	ON governance_delegations (delegate_principal_id);
