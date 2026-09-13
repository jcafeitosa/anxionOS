-- connections module baseline schema
-- Transcribed from the module's own Drizzle schema (the authority):
--   modules/connections/src/infrastructure/persistence/schema.ts

CREATE TABLE IF NOT EXISTS connections_ai_accounts (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	owner_principal_id UUID NOT NULL,
	provider_id TEXT NOT NULL,
	display_name TEXT NOT NULL,
	status TEXT NOT NULL,
	revision INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS connections_ai_accounts_org_owner_idx
 ON connections_ai_accounts (organization_id, owner_principal_id);

CREATE TABLE IF NOT EXISTS connections_connection_bindings (
	id TEXT PRIMARY KEY,
	connection_id TEXT NOT NULL,
	binding_version INTEGER NOT NULL,
	organization_id UUID NOT NULL,
	ai_account_id TEXT NOT NULL,
	kind TEXT NOT NULL,
	environment TEXT NOT NULL,
	adapter_id TEXT NOT NULL,
	status TEXT NOT NULL,
	revision INTEGER NOT NULL,
	secret_id TEXT NOT NULL,
	secret_generation INTEGER NOT NULL,
	activated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS connections_bindings_org_status_idx
 ON connections_connection_bindings (organization_id, status);

CREATE TABLE IF NOT EXISTS connections_inference_requests (
	id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	binding_id TEXT NOT NULL,
	binding_version INTEGER NOT NULL,
	idempotency_key TEXT NOT NULL,
	operation TEXT NOT NULL,
	request_hash TEXT,
	status TEXT NOT NULL,
	model_ref TEXT,
	latency_ms INTEGER,
	completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS connections_inference_org_idempotency_idx
 ON connections_inference_requests (organization_id, idempotency_key);

CREATE TABLE IF NOT EXISTS connections_usage_records (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	ai_account_id TEXT NOT NULL,
	connection_binding_id TEXT NOT NULL,
	binding_version INTEGER NOT NULL,
	inference_request_id UUID NOT NULL,
	consumer_kind TEXT NOT NULL,
	consumer_principal_id UUID NOT NULL,
	operation TEXT NOT NULL,
	quantity TEXT NOT NULL,
	unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS connections_command_journal (
	command_id UUID NOT NULL,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	request_hash TEXT,
	response_snapshot JSONB NOT NULL,
	PRIMARY KEY (organization_id, command_id)
);
