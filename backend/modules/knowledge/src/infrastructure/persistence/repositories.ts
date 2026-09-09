import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type {
	ChunkRecord,
	ChunkRepository,
	DocumentRecord,
	DocumentRepository,
	DocumentVersionRecord,
	DocumentVersionRepository,
	EmbeddingRepository,
	EmbeddingSpaceRecord,
	EmbeddingSpaceRepository,
	IndexGenerationRecord,
	IndexGenerationRepository,
	KnowledgeSourceRecord,
	KnowledgeSourceRepository,
} from "../../domain/ports/knowledge-unit-of-work";

function mapSource(row: Record<string, unknown>): KnowledgeSourceRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		displayName: String(row.display_name),
		sourceKind: String(row.source_kind),
		defaultClassification: String(row.default_classification),
		defaultAclId: String(row.default_acl_id),
		defaultAclEpoch: Number(row.default_acl_epoch),
		status: String(row.status),
		revision: Number(row.revision),
	};
}

export function createPgKnowledgeSourceRepository(
	client: PoolClient,
): KnowledgeSourceRepository {
	return {
		async findById(sourceId, organizationId) {
			const result = await client.query(
				`SELECT * FROM knowledge_sources WHERE id = $1 AND organization_id = $2`,
				[sourceId, organizationId],
			);
			const row = result.rows[0];
			return row ? mapSource(row as Record<string, unknown>) : null;
		},
		async findActiveByNaturalKey(organizationId, displayName) {
			const result = await client.query(
				`SELECT * FROM knowledge_sources WHERE organization_id = $1 AND display_name = $2 AND status = 'ACTIVE'`,
				[organizationId, displayName],
			);
			const row = result.rows[0];
			return row ? mapSource(row as Record<string, unknown>) : null;
		},
		async save(record: KnowledgeSourceRecord) {
			await client.query(
				`INSERT INTO knowledge_sources (id, organization_id, display_name, source_kind, default_classification,
				 default_acl_id, default_acl_epoch, status, revision)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				[
					record.id,
					record.organizationId,
					record.displayName,
					record.sourceKind,
					record.defaultClassification,
					record.defaultAclId,
					record.defaultAclEpoch,
					record.status,
					record.revision,
				],
			);
			return record;
		},
	};
}

export function createPgDocumentRepository(client: PoolClient): DocumentRepository {
	return {
		async findById(documentId, organizationId) {
			const result = await client.query(
				`SELECT * FROM knowledge_documents WHERE id = $1 AND organization_id = $2`,
				[documentId, organizationId],
			);
			const row = result.rows[0] as Record<string, unknown> | undefined;
			if (!row) return null;
			return {
				id: String(row.id),
				organizationId: String(row.organization_id),
				knowledgeSourceId: String(row.knowledge_source_id),
				title: String(row.title),
				classification: String(row.classification),
				aclId: String(row.acl_id),
				aclEpoch: Number(row.acl_epoch),
				activeVersionId: row.active_version_id ? String(row.active_version_id) : null,
				status: String(row.status),
				revision: Number(row.revision),
			};
		},
		async save(record: DocumentRecord) {
			await client.query(
				`INSERT INTO knowledge_documents (id, organization_id, knowledge_source_id, title, classification,
				 acl_id, acl_epoch, active_version_id, status, revision)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				[
					record.id,
					record.organizationId,
					record.knowledgeSourceId,
					record.title,
					record.classification,
					record.aclId,
					record.aclEpoch,
					record.activeVersionId,
					record.status,
					record.revision,
				],
			);
			return record;
		},
		async update(record: DocumentRecord) {
			await client.query(
				`UPDATE knowledge_documents SET active_version_id = $3, status = $4, revision = $5, updated_at = now()
				 WHERE id = $1 AND organization_id = $2`,
				[record.id, record.organizationId, record.activeVersionId, record.status, record.revision],
			);
			return record;
		},
	};
}

export function createPgDocumentVersionRepository(
	client: PoolClient,
): DocumentVersionRepository {
	return {
		async findById(id, organizationId) {
			const result = await client.query(
				`SELECT * FROM knowledge_document_versions WHERE id = $1 AND organization_id = $2`,
				[id, organizationId],
			);
			const row = result.rows[0] as Record<string, unknown> | undefined;
			if (!row) return null;
			return {
				id: String(row.id),
				documentId: String(row.document_id),
				organizationId: String(row.organization_id),
				versionNumber: Number(row.version_number),
				contentHash: String(row.content_hash),
				blobBucket: String(row.blob_bucket),
				blobObjectKey: String(row.blob_object_key),
				mimeType: String(row.mime_type),
				byteSize: Number(row.byte_size),
			};
		},
		async save(record: DocumentVersionRecord) {
			await client.query(
				`INSERT INTO knowledge_document_versions (id, document_id, organization_id, version_number,
				 content_hash, blob_bucket, blob_object_key, mime_type, byte_size)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				[
					record.id,
					record.documentId,
					record.organizationId,
					record.versionNumber,
					record.contentHash,
					record.blobBucket,
					record.blobObjectKey,
					record.mimeType,
					record.byteSize,
				],
			);
			return record;
		},
		async countByDocument(documentId) {
			const result = await client.query(
				`SELECT count(*)::int AS c FROM knowledge_document_versions WHERE document_id = $1`,
				[documentId],
			);
			return Number(result.rows[0].c);
		},
	};
}

export function createPgIndexGenerationRepository(
	client: PoolClient,
): IndexGenerationRepository {
	return {
		async findById(id, organizationId) {
			const result = await client.query(
				`SELECT * FROM knowledge_index_generations WHERE id = $1 AND organization_id = $2`,
				[id, organizationId],
			);
			const row = result.rows[0] as Record<string, unknown> | undefined;
			if (!row) return null;
			return {
				id: String(row.id),
				organizationId: String(row.organization_id),
				documentId: String(row.document_id),
				documentVersionId: String(row.document_version_id),
				embeddingSpaceId: String(row.embedding_space_id),
				status: String(row.status),
				chunkCount: Number(row.chunk_count),
				embeddedCount: Number(row.embedded_count),
			};
		},
		async save(record: IndexGenerationRecord) {
			await client.query(
				`INSERT INTO knowledge_index_generations (id, organization_id, document_id, document_version_id,
				 embedding_space_id, status, chunk_count, embedded_count)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[
					record.id,
					record.organizationId,
					record.documentId,
					record.documentVersionId,
					record.embeddingSpaceId,
					record.status,
					record.chunkCount,
					record.embeddedCount,
				],
			);
			return record;
		},
		async update(record: IndexGenerationRecord) {
			await client.query(
				`UPDATE knowledge_index_generations SET status = $3::knowledge_index_status, chunk_count = $4, embedded_count = $5,
				 activated_at = CASE WHEN $3::text = 'ACTIVE' THEN now() ELSE activated_at END
				 WHERE id = $1 AND organization_id = $2`,
				[record.id, record.organizationId, record.status, record.chunkCount, record.embeddedCount],
			);
			return record;
		},
	};
}

export function createPgChunkRepository(client: PoolClient): ChunkRepository {
	return {
		async saveMany(records: ChunkRecord[]) {
			for (const record of records) {
				await client.query(
					`INSERT INTO knowledge_chunks (id, organization_id, document_version_id, index_generation_id,
					 sequence, content_hash, token_count)
					 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
					[
						record.id,
						record.organizationId,
						record.documentVersionId,
						record.indexGenerationId,
						record.sequence,
						record.contentHash,
						record.tokenCount,
					],
				);
			}
		},
		async listByIndexGeneration(indexGenerationId) {
			const result = await client.query(
				`SELECT * FROM knowledge_chunks WHERE index_generation_id = $1 ORDER BY sequence`,
				[indexGenerationId],
			);
			return result.rows.map((row: Record<string, unknown>) => ({
				id: String(row.id),
				organizationId: String(row.organization_id),
				documentVersionId: String(row.document_version_id),
				indexGenerationId: String(row.index_generation_id),
				sequence: Number(row.sequence),
				contentHash: String(row.content_hash),
				tokenCount: Number(row.token_count),
			}));
		},
	};
}

export function createPgEmbeddingRepository(client: PoolClient): EmbeddingRepository {
	return {
		async save(record) {
			const vectorLiteral = `[${record.vector.join(",")}]`;
			await client.query(
				`INSERT INTO knowledge_embeddings (id, organization_id, chunk_id, embedding_space_id, dimensions, embedding)
				 VALUES ($1,$2,$3,$4,$5,$6::vector)`,
				[
					record.id,
					record.organizationId,
					record.chunkId,
					record.embeddingSpaceId,
					record.dimensions,
					vectorLiteral,
				],
			);
		},
		async countByIndexGeneration(indexGenerationId) {
			const result = await client.query(
				`SELECT count(*)::int AS c FROM knowledge_embeddings e
				 JOIN knowledge_chunks c ON c.id = e.chunk_id
				 WHERE c.index_generation_id = $1`,
				[indexGenerationId],
			);
			return Number(result.rows[0].c);
		},
	};
}

export function createPgEmbeddingSpaceRepository(
	client: PoolClient,
): EmbeddingSpaceRepository {
	return {
		async findById(id, organizationId) {
			const result = await client.query(
				`SELECT * FROM knowledge_embedding_spaces WHERE id = $1 AND organization_id = $2`,
				[id, organizationId],
			);
			const row = result.rows[0] as Record<string, unknown> | undefined;
			if (!row) return null;
			return {
				id: String(row.id),
				organizationId: String(row.organization_id),
				displayName: String(row.display_name),
				dimensions: Number(row.dimensions),
				modelRef: String(row.model_ref),
			};
		},
		async save(record: EmbeddingSpaceRecord) {
			await client.query(
				`INSERT INTO knowledge_embedding_spaces (id, organization_id, display_name, dimensions, model_ref)
				 VALUES ($1,$2,$3,$4,$5)`,
				[record.id, record.organizationId, record.displayName, record.dimensions, record.modelRef],
			);
			return record;
		},
	};
}

export function hashText(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

export function splitIntoChunks(text: string, maxLen = 256): string[] {
	const parts: string[] = [];
	let cursor = 0;
	while (cursor < text.length) {
		parts.push(text.slice(cursor, cursor + maxLen));
		cursor += maxLen;
	}
	return parts.length > 0 ? parts : [text];
}
