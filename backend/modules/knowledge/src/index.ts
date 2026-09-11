export {
	type IngestDocumentDeps,
	ingestDocument,
} from "./application/commands/ingest-document";
export {
	type PromoteCandidateMemoryDeps,
	promoteCandidateMemory,
} from "./application/commands/promote-candidate-memory";
export {
	type PublishIndexDeps,
	publishIndex,
} from "./application/commands/publish-index";
export {
	type RegisterCandidateMemoryDeps,
	registerCandidateMemory,
} from "./application/commands/register-candidate-memory";
export {
	type RegisterKnowledgeSourceDeps,
	registerKnowledgeSource,
} from "./application/commands/register-knowledge-source";
export {
	type RetrieveKnowledgeDeps,
	retrieveKnowledge,
} from "./application/commands/retrieve-knowledge";
export {
	type RevokeDocumentAccessDeps,
	revokeDocumentAccess,
} from "./application/commands/revoke-document-access";
export {
	buildContextManifest,
	recallAtK,
} from "./application/context-manifest";
export {
	KnowledgeCommandError,
	throwKnowledgeError,
} from "./application/errors";
export { sanitizeRetrievalQuery } from "./application/query-sanitizer";
export { cosineSimilarity } from "./application/retrieval-ranking";
export {
	createIngestDocumentWorker,
	type IngestDocumentWorkerDeps,
} from "./application/workers/ingest-document-worker";
export { createInMemoryMemoryStore } from "./infrastructure/adapters/in-memory-memory-store";
export {
	createSimulatedEmbeddingPort,
	SIMULATED_EMBEDDING_DIMENSIONS,
} from "./infrastructure/adapters/simulated-embedding-adapter";
export { createKnowledgeUnitOfWork } from "./infrastructure/knowledge-unit-of-work";
export { ensureKnowledgeSchema } from "./infrastructure/migrate";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
