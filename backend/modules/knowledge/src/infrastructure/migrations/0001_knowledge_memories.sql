-- Durable candidate/promoted memory entries owned by the knowledge module.
CREATE TABLE IF NOT EXISTS knowledge_memories (
	id TEXT PRIMARY KEY,
	organization_id TEXT NOT NULL,
	tier TEXT NOT NULL CHECK (tier IN ('CANDIDATE', 'PROMOTED')),
	summary TEXT NOT NULL,
	content_hash TEXT NOT NULL,
	source_document_id TEXT,
	created_at TIMESTAMPTZ NOT NULL,
	promoted_at TIMESTAMPTZ,
	CHECK (
		(tier = 'CANDIDATE' AND promoted_at IS NULL) OR
		(tier = 'PROMOTED' AND promoted_at IS NOT NULL)
	)
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_memories_org_content_hash_uidx
	ON knowledge_memories (organization_id, content_hash);
CREATE INDEX IF NOT EXISTS knowledge_memories_org_tier_created_idx
	ON knowledge_memories (organization_id, tier, created_at, id);
