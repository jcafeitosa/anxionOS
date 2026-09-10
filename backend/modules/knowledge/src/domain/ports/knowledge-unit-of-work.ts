import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
export interface KnowledgeSourceRecord {
	id: string;
	organizationId: string;
	displayName: string;
	sourceKind: string;
	defaultClassification: string;
	defaultAclId: string;
	defaultAclEpoch: number;
	status: string;
	revision: number;
}
export interface DocumentRecord {
	id: string;
	organizationId: string;
	knowledgeSourceId: string;
	title: string;
	classification: string;
	aclId: string;
	aclEpoch: number;
	activeVersionId: string | null;
	status: string;
	revision: number;
}
export interface DocumentVersionRecord {
	id: string;
	documentId: string;
	organizationId: string;
	versionNumber: number;
	contentHash: string;
	blobBucket: string;
	blobObjectKey: string;
	mimeType: string;
	byteSize: number;
}
export interface IndexGenerationRecord {
	id: string;
	organizationId: string;
	documentId: string;
	documentVersionId: string;
	embeddingSpaceId: string;
	status: string;
	chunkCount: number;
	embeddedCount: number;
}
export interface ChunkRecord {
	id: string;
	organizationId: string;
	documentVersionId: string;
	indexGenerationId: string;
	sequence: number;
	contentHash: string;
	textContent: string;
	tokenCount: number;
}
export interface RetrievalEmbeddingRecord {
	chunkId: string;
	organizationId: string;
	embeddingSpaceId: string;
	dimensions: number;
	vector: number[];
}
export interface EmbeddingSpaceRecord {
	id: string;
	organizationId: string;
	displayName: string;
	dimensions: number;
	modelRef: string;
}
export interface KnowledgeSourceRepository {
	findById(
		sourceId: string,
		organizationId: string,
	): Promise<KnowledgeSourceRecord | null>;
	findActiveByNaturalKey(
		organizationId: string,
		displayName: string,
	): Promise<KnowledgeSourceRecord | null>;
	save(record: KnowledgeSourceRecord): Promise<KnowledgeSourceRecord>;
}
export interface DocumentRepository {
	findById(
		documentId: string,
		organizationId: string,
	): Promise<DocumentRecord | null>;
	listActiveByOrganization(organizationId: string): Promise<DocumentRecord[]>;
	save(record: DocumentRecord): Promise<DocumentRecord>;
	update(record: DocumentRecord): Promise<DocumentRecord>;
}
export interface DocumentVersionRepository {
	findById(
		id: string,
		organizationId: string,
	): Promise<DocumentVersionRecord | null>;
	save(record: DocumentVersionRecord): Promise<DocumentVersionRecord>;
	countByDocument(documentId: string): Promise<number>;
}
export interface IndexGenerationRepository {
	findById(
		id: string,
		organizationId: string,
	): Promise<IndexGenerationRecord | null>;
	save(record: IndexGenerationRecord): Promise<IndexGenerationRecord>;
	update(record: IndexGenerationRecord): Promise<IndexGenerationRecord>;
}
export interface ChunkRepository {
	saveMany(records: ChunkRecord[]): Promise<void>;
	listByIndexGeneration(indexGenerationId: string): Promise<ChunkRecord[]>;
	listByDocumentVersion(documentVersionId: string): Promise<ChunkRecord[]>;
}
export interface EmbeddingRepository {
	save(record: {
		id: string;
		organizationId: string;
		chunkId: string;
		embeddingSpaceId: string;
		dimensions: number;
		vector: number[];
	}): Promise<void>;
	countByIndexGeneration(indexGenerationId: string): Promise<number>;
	listByOrganization(organizationId: string): Promise<RetrievalEmbeddingRecord[]>;
	purgeByChunkIds(chunkIds: string[]): Promise<number>;
}
export interface EmbeddingSpaceRepository {
	findById(
		id: string,
		organizationId: string,
	): Promise<EmbeddingSpaceRecord | null>;
	save(record: EmbeddingSpaceRecord): Promise<EmbeddingSpaceRecord>;
}
export interface KnowledgeTransactionContext {
	commandJournal: CommandJournalRepository;
	sources: KnowledgeSourceRepository;
	documents: DocumentRepository;
	documentVersions: DocumentVersionRepository;
	indexGenerations: IndexGenerationRepository;
	chunks: ChunkRepository;
	embeddings: EmbeddingRepository;
	embeddingSpaces: EmbeddingSpaceRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface KnowledgeUnitOfWork {
	runInTransaction<T>(
		work: (ctx: KnowledgeTransactionContext) => Promise<T>,
	): Promise<T>;
}
