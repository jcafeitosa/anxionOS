export {
	registerKnowledgeSource,
	type RegisterKnowledgeSourceDeps,
} from "./application/commands/register-knowledge-source";
export {
	ingestDocument,
	type IngestDocumentDeps,
} from "./application/commands/ingest-document";
export {
	publishIndex,
	type PublishIndexDeps,
} from "./application/commands/publish-index";
export {
	revokeDocumentAccess,
	type RevokeDocumentAccessDeps,
} from "./application/commands/revoke-document-access";
export {
	retrieveKnowledge,
	type RetrieveKnowledgeDeps,
} from "./application/commands/retrieve-knowledge";
export {
	registerCandidateMemory,
	type RegisterCandidateMemoryDeps,
} from "./application/commands/register-candidate-memory";
export {
	promoteCandidateMemory,
	type PromoteCandidateMemoryDeps,
} from "./application/commands/promote-candidate-memory";
export { sanitizeRetrievalQuery } from "./application/query-sanitizer";
export { buildContextManifest, recallAtK } from "./application/context-manifest";
export { cosineSimilarity } from "./application/retrieval-ranking";
export { createInMemoryMemoryStore } from "./infrastructure/adapters/in-memory-memory-store";
export {
	createIngestDocumentWorker,
	type IngestDocumentWorkerDeps,
} from "./application/workers/ingest-document-worker";
export {
	KnowledgeCommandError,
	throwKnowledgeError,
} from "./application/errors";
export { ensureKnowledgeSchema } from "./infrastructure/migrate";
export { createKnowledgeUnitOfWork } from "./infrastructure/knowledge-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
export {
	createSimulatedEmbeddingPort,
	SIMULATED_EMBEDDING_DIMENSIONS,
} from "./infrastructure/adapters/simulated-embedding-adapter";
