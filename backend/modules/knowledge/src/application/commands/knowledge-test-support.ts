import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalEntry } from "../../domain/ports/command-journal";
import type {
	ChunkRecord,
	DocumentRecord,
	DocumentVersionRecord,
	EmbeddingSpaceRecord,
	IndexGenerationRecord,
	KnowledgeSourceRecord,
	KnowledgeTransactionContext,
	KnowledgeUnitOfWork,
	RetrievalEmbeddingRecord,
} from "../../domain/ports/knowledge-unit-of-work";

export const TEST_ORG = "00000000-0000-4000-8000-000000000001";
export const TEST_ACL_ID = "11111111-1111-4111-8111-111111111111";

export function createKnowledgeTestUow(initial?: {
	documents?: DocumentRecord[];
	chunks?: ChunkRecord[];
	embeddings?: RetrievalEmbeddingRecord[];
	embeddingSpaces?: EmbeddingSpaceRecord[];
}) {
	const sources = new Map<string, KnowledgeSourceRecord>();
	const documents = new Map(
		(initial?.documents ?? []).map((row) => [row.id, row]),
	);
	const versions = new Map<string, DocumentVersionRecord>();
	const indexes = new Map<string, IndexGenerationRecord>();
	const chunks = new Map((initial?.chunks ?? []).map((row) => [row.id, row]));
	const embeddings = new Map(
		(initial?.embeddings ?? []).map((row) => [row.chunkId, row]),
	);
	const spaces = new Map(
		(initial?.embeddingSpaces ?? []).map((row) => [row.id, row]),
	);
	const journal = new Map<string, CommandJournalEntry>();
	let published: DomainEventEnvelope[] = [];

	const ctx: KnowledgeTransactionContext = {
		commandJournal: {
			async findByCommandId(commandId) {
				return journal.get(commandId) ?? null;
			},
			async save(entry) {
				journal.set(entry.commandId, entry);
			},
		},
		sources: {
			async findById(id, org) {
				const row = sources.get(id);
				return row && row.organizationId === org ? row : null;
			},
			async findActiveByNaturalKey() {
				return null;
			},
			async save(record) {
				sources.set(record.id, record);
				return record;
			},
		},
		documents: {
			async findById(id, org) {
				const row = documents.get(id);
				return row && row.organizationId === org ? row : null;
			},
			async listActiveByOrganization(organizationId) {
				return [...documents.values()].filter(
					(row) =>
						row.organizationId === organizationId && row.status === "ACTIVE",
				);
			},
			async save(record) {
				documents.set(record.id, record);
				return record;
			},
			async update(record) {
				documents.set(record.id, record);
				return record;
			},
		},
		documentVersions: {
			async findById(id, org) {
				const row = versions.get(id);
				return row && row.organizationId === org ? row : null;
			},
			async save(record) {
				versions.set(record.id, record);
				return record;
			},
			async countByDocument() {
				return 0;
			},
		},
		indexGenerations: {
			async findById(id, org) {
				const row = indexes.get(id);
				return row && row.organizationId === org ? row : null;
			},
			async save(record) {
				indexes.set(record.id, record);
				return record;
			},
			async update(record) {
				indexes.set(record.id, record);
				return record;
			},
		},
		chunks: {
			async saveMany(records) {
				for (const record of records) chunks.set(record.id, record);
			},
			async listByIndexGeneration(indexGenerationId) {
				return [...chunks.values()].filter(
					(row) => row.indexGenerationId === indexGenerationId,
				);
			},
			async listByDocumentVersion(documentVersionId) {
				return [...chunks.values()].filter(
					(row) => row.documentVersionId === documentVersionId,
				);
			},
		},
		embeddings: {
			async save(record) {
				embeddings.set(record.chunkId, {
					chunkId: record.chunkId,
					organizationId: record.organizationId,
					embeddingSpaceId: record.embeddingSpaceId,
					dimensions: record.dimensions,
					vector: record.vector,
				});
			},
			async countByIndexGeneration(indexGenerationId) {
				return [...chunks.values()].filter(
					(row) => row.indexGenerationId === indexGenerationId,
				).length;
			},
			async listByOrganization(organizationId) {
				return [...embeddings.values()].filter(
					(row) => row.organizationId === organizationId,
				);
			},
			async purgeByChunkIds(chunkIds) {
				let count = 0;
				for (const chunkId of chunkIds) {
					if (embeddings.delete(chunkId)) count += 1;
				}
				return count;
			},
		},
		embeddingSpaces: {
			async findById(id, org) {
				const row = spaces.get(id);
				return row && row.organizationId === org ? row : null;
			},
			async save(record) {
				spaces.set(record.id, record);
				return record;
			},
		},
		async publishEvents(events) {
			published = [...published, ...events];
		},
	};

	const unitOfWork: KnowledgeUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};

	return {
		unitOfWork,
		commandJournal: ctx.commandJournal,
		getDocuments: () => documents,
		getEmbeddings: () => embeddings,
		getPublished: () => published,
	};
}
