-- knowledge module baseline schema
-- Derived strictly from the repository contract:
--   modules/knowledge/src/infrastructure/persistence/{repositories,command-journal-repository}.ts
-- Note: `knowledge_embeddings.embedding` uses pgvector, provisioned by
-- `scripts/db-bootstrap.mjs` (CREATE EXTENSION IF NOT EXISTS vector).

DO $$ BEGIN
 CREATE TYPE knowledge_index_status AS ENUM (
  'PENDING', 'INDEXING', 'ACTIVE', 'FAILED'
 );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS knowledge_sources (
	id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	display_name TEXT NOT NULL,
	source_kind TEXT NOT NULL,
	default_classification TEXT NOT NULL,
	default_acl_id UUID,
	default_acl_epoch INTEGER,
	status TEXT NOT NULL,
	revision INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS knowledge_sources_org_name_uidx
 ON knowledge_sources (organization_id, display_name);

CREATE TABLE IF NOT EXISTS knowledge_documents (
	id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources (id),
	title TEXT NOT NULL,
	classification TEXT NOT NULL,
	acl_id UUID,
	acl_epoch INTEGER,
	active_version_id UUID,
	status TEXT NOT NULL,
	revision INTEGER NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_documents_org_status_idx
 ON knowledge_documents (organization_id, status);

CREATE TABLE IF NOT EXISTS knowledge_document_versions (
	id UUID PRIMARY KEY,
	document_id UUID NOT NULL REFERENCES knowledge_documents (id),
	organization_id UUID NOT NULL,
	version_number INTEGER NOT NULL,
	content_hash TEXT NOT NULL,
	blob_bucket TEXT NOT NULL,
	blob_object_key TEXT NOT NULL,
	mime_type TEXT NOT NULL,
	byte_size INTEGER NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_document_versions_document_idx
 ON knowledge_document_versions (document_id);

CREATE TABLE IF NOT EXISTS knowledge_embedding_spaces (
	id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	display_name TEXT NOT NULL,
	dimensions INTEGER NOT NULL,
	model_ref TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_index_generations (
	id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	document_id UUID NOT NULL REFERENCES knowledge_documents (id),
	document_version_id UUID NOT NULL REFERENCES knowledge_document_versions (id),
	embedding_space_id UUID NOT NULL REFERENCES knowledge_embedding_spaces (id),
	status knowledge_index_status NOT NULL,
	chunk_count INTEGER,
	embedded_count INTEGER,
	activated_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_index_generations_document_idx
 ON knowledge_index_generations (document_id);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
	id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	document_version_id UUID NOT NULL REFERENCES knowledge_document_versions (id),
	index_generation_id UUID NOT NULL REFERENCES knowledge_index_generations (id),
	sequence INTEGER NOT NULL,
	content_hash TEXT NOT NULL,
	text_content TEXT NOT NULL,
	token_count INTEGER NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_doc_version_seq_idx
 ON knowledge_chunks (document_version_id, sequence);
CREATE INDEX IF NOT EXISTS knowledge_chunks_index_generation_idx
 ON knowledge_chunks (index_generation_id);

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
	id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	chunk_id UUID NOT NULL REFERENCES knowledge_chunks (id),
	embedding_space_id UUID NOT NULL REFERENCES knowledge_embedding_spaces (id),
	dimensions INTEGER NOT NULL,
	embedding vector NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_embeddings_chunk_idx
 ON knowledge_embeddings (chunk_id);
CREATE INDEX IF NOT EXISTS knowledge_embeddings_space_chunk_uidx
 ON knowledge_embeddings (embedding_space_id, chunk_id);

CREATE TABLE IF NOT EXISTS knowledge_command_journal (
	command_id UUID PRIMARY KEY,
	organization_id UUID NOT NULL,
	command_name TEXT NOT NULL,
	response_snapshot JSONB
);

CREATE INDEX IF NOT EXISTS knowledge_command_journal_org_idx
 ON knowledge_command_journal (organization_id);