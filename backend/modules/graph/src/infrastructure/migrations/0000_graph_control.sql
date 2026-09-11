-- graph module — PG control plane (catálogo de contratos, inbox de projeção,
-- rebuild, gerações e DLQ). Espelha modules/graph/src/infrastructure/persistence/schema.ts.
-- Idempotente: reaplicável em banco já inicializado.

DO $$ BEGIN
 CREATE TYPE graph_schema_status AS ENUM ('active', 'deprecated', 'disabled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE graph_inbox_status AS ENUM ('pending', 'processing', 'acked', 'quarantined');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE graph_rebuild_status AS ENUM ('pending', 'draining', 'rebuilding', 'verifying', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE graph_dlq_replay_status AS ENUM ('open', 'replayed', 'discarded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE graph_traversal_cacheable AS ENUM ('never', 'conditional', 'always');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS graph_schema_node_types (
 node_type TEXT NOT NULL,
 schema_version INTEGER NOT NULL,
 owner_domain TEXT NOT NULL,
 status graph_schema_status NOT NULL DEFAULT 'active',
 payload_schema_ref TEXT NOT NULL,
 checksum TEXT NOT NULL,
 activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT graph_schema_node_types_pk PRIMARY KEY (node_type, schema_version)
);

CREATE INDEX IF NOT EXISTS graph_schema_node_types_owner_domain_idx
 ON graph_schema_node_types (owner_domain);

CREATE TABLE IF NOT EXISTS graph_schema_edge_types (
 edge_type_id TEXT PRIMARY KEY,
 edge_type TEXT NOT NULL,
 schema_version INTEGER NOT NULL,
 from_node_types JSONB NOT NULL,
 to_node_types JSONB NOT NULL,
 writer_domain TEXT NOT NULL,
 cardinality TEXT NOT NULL,
 temporal INTEGER NOT NULL DEFAULT 0,
 cross_scope_policy TEXT NOT NULL,
 status graph_schema_status NOT NULL DEFAULT 'active',
 activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS graph_schema_edge_types_writer_domain_idx
 ON graph_schema_edge_types (writer_domain);

CREATE TABLE IF NOT EXISTS graph_registry_generation (
 id TEXT PRIMARY KEY DEFAULT 'current',
 generation BIGINT NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graph_traversal_catalog (
 traversal_id TEXT NOT NULL,
 query_version INTEGER NOT NULL,
 class TEXT NOT NULL,
 edge_allowlist JSONB NOT NULL,
 input_schema_ref TEXT NOT NULL,
 output_schema_ref TEXT NOT NULL,
 max_depth INTEGER NOT NULL DEFAULT 8,
 max_visited INTEGER NOT NULL DEFAULT 256,
 cacheable graph_traversal_cacheable NOT NULL DEFAULT 'never',
 fixture_version TEXT NOT NULL DEFAULT 'f0',
 registry_generation BIGINT NOT NULL DEFAULT 1,
 activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT graph_traversal_catalog_pk PRIMARY KEY (traversal_id, query_version)
);

CREATE TABLE IF NOT EXISTS graph_projection_inbox (
 event_id TEXT NOT NULL,
 consumer_name TEXT NOT NULL,
 owner_domain TEXT NOT NULL,
 status graph_inbox_status NOT NULL DEFAULT 'pending',
 checkpoint BIGINT NOT NULL DEFAULT 0,
 projection_generation BIGINT NOT NULL DEFAULT 0,
 processed_at TIMESTAMPTZ,
 error_code TEXT,
 attempt_count INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT graph_projection_inbox_pk PRIMARY KEY (event_id, consumer_name)
);

CREATE INDEX IF NOT EXISTS graph_projection_inbox_status_idx
 ON graph_projection_inbox (status);

CREATE INDEX IF NOT EXISTS graph_projection_inbox_owner_domain_idx
 ON graph_projection_inbox (owner_domain);

CREATE TABLE IF NOT EXISTS graph_rebuild_jobs (
 job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 status graph_rebuild_status NOT NULL DEFAULT 'pending',
 target_generation BIGINT NOT NULL,
 cutoff_checkpoint BIGINT NOT NULL,
 owner_domain_order JSONB NOT NULL,
 registry_generation BIGINT NOT NULL,
 audit_manifest_id UUID,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS graph_rebuild_jobs_status_idx
 ON graph_rebuild_jobs (status);

CREATE TABLE IF NOT EXISTS graph_projection_generation (
 consumer_name TEXT PRIMARY KEY,
 generation BIGINT NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graph_current_generation (
 id TEXT PRIMARY KEY DEFAULT 'current',
 generation BIGINT NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graph_projection_dlq (
 dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id TEXT NOT NULL,
 consumer_name TEXT NOT NULL,
 owner_domain TEXT NOT NULL,
 quarantined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 error_code TEXT NOT NULL,
 attempt_count INTEGER NOT NULL,
 payload_ref TEXT NOT NULL,
 replay_status graph_dlq_replay_status NOT NULL DEFAULT 'open',
 audit_manifest_id UUID
);

CREATE INDEX IF NOT EXISTS graph_projection_dlq_replay_status_idx
 ON graph_projection_dlq (replay_status);

CREATE INDEX IF NOT EXISTS graph_projection_dlq_consumer_name_idx
 ON graph_projection_dlq (consumer_name);
