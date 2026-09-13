import type {
	MemoryEntryRecord,
	MemoryStorePort,
} from "../../domain/ports/memory-store";

export interface KnowledgeMemoryQueryable {
	query<T extends Record<string, unknown>>(
		text: string,
		values?: readonly unknown[],
	): Promise<{ rows: T[] }>;
}

interface MemoryRow extends Record<string, unknown> {
	id: string;
	organization_id: string;
	tier: MemoryEntryRecord["tier"];
	summary: string;
	content_hash: string;
	source_document_id: string | null;
	created_at: string | Date;
	promoted_at: string | Date | null;
}

function mapMemory(row: MemoryRow): MemoryEntryRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		tier: row.tier,
		summary: String(row.summary),
		contentHash: String(row.content_hash),
		sourceDocumentId: row.source_document_id
			? String(row.source_document_id)
			: null,
		createdAt: new Date(row.created_at).toISOString(),
		promotedAt: row.promoted_at
			? new Date(row.promoted_at).toISOString()
			: null,
	};
}

export function createPgMemoryStore(
	client: KnowledgeMemoryQueryable,
): MemoryStorePort {
	async function findByContentHash(
		organizationId: string,
		contentHash: string,
	): Promise<MemoryEntryRecord | null> {
		const result = await client.query<MemoryRow>(
			`SELECT id, organization_id, tier, summary, content_hash, source_document_id,
				created_at, promoted_at
			 FROM knowledge_memories
			 WHERE organization_id = $1 AND content_hash = $2`,
			[organizationId, contentHash],
		);
		const row = result.rows[0];
		return row ? mapMemory(row) : null;
	}

	return {
		async findById(id, organizationId) {
			const result = await client.query<MemoryRow>(
				`SELECT id, organization_id, tier, summary, content_hash, source_document_id,
					created_at, promoted_at
				 FROM knowledge_memories
				 WHERE id = $1 AND organization_id = $2`,
				[id, organizationId],
			);
			const row = result.rows[0];
			return row ? mapMemory(row) : null;
		},
		findByContentHash,
		async save(record) {
			const result = await client.query<MemoryRow>(
				`INSERT INTO knowledge_memories
					(id, organization_id, tier, summary, content_hash, source_document_id,
					 created_at, promoted_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				 ON CONFLICT (organization_id, content_hash) DO NOTHING
				 RETURNING id, organization_id, tier, summary, content_hash,
					 source_document_id, created_at, promoted_at`,
				[
					record.id,
					record.organizationId,
					record.tier,
					record.summary,
					record.contentHash,
					record.sourceDocumentId,
					record.createdAt,
					record.promotedAt,
				],
			);
			const row = result.rows[0];
			if (row) return mapMemory(row);
			const existing = await findByContentHash(
				record.organizationId,
				record.contentHash,
			);
			if (!existing) {
				throw new Error("Memory natural-key insert produced no record");
			}
			return existing;
		},
		async update(record) {
			const result = await client.query<MemoryRow>(
				`UPDATE knowledge_memories
				 SET tier = $3, promoted_at = $4
				 WHERE id = $1 AND organization_id = $2
				 RETURNING id, organization_id, tier, summary, content_hash,
					 source_document_id, created_at, promoted_at`,
				[record.id, record.organizationId, record.tier, record.promotedAt],
			);
			const row = result.rows[0];
			if (!row) {
				throw new Error(`Memory entry ${record.id} not found`);
			}
			return mapMemory(row);
		},
		async listByTier(organizationId, tier) {
			const result = await client.query<MemoryRow>(
				`SELECT id, organization_id, tier, summary, content_hash,
					source_document_id, created_at, promoted_at
				 FROM knowledge_memories
				 WHERE organization_id = $1 AND tier = $2
				 ORDER BY created_at, id`,
				[organizationId, tier],
			);
			return result.rows.map(mapMemory);
		},
	};
}
