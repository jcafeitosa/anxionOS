import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	chunkIdSchema,
	documentIdSchema,
	documentVersionIdSchema,
	embeddingSpaceIdSchema,
	indexGenerationIdSchema,
} from "./types";
export const KNOWLEDGE_EVENT_TYPES = {
	DOCUMENT_INDEXED: "knowledge.document.indexed.v1",
	CHUNK_EMBEDDED: "knowledge.chunk.embedded.v1",
	DOCUMENT_ACCESS_REVOKED: "knowledge.document.access_revoked.v1",
	MEMORY_PROMOTED: "knowledge.memory.promoted.v1",
	EVIDENCE_RECORDED: "knowledge.evidence.recorded.v1",
};
export const evidenceSourceRefSchema = z.object({
	kind: z.enum(["decision", "document", "run", "memory", "correlation"]),
	refId: z.string().min(1),
});
export const evidenceProvenanceKindSchema = z.enum([
	"DOCUMENT",
	"RETRIEVAL",
	"MANUAL",
	"RUN_ARTIFACT",
]);
export const evidenceRecordedPayloadSchema = z.object({
	evidenceId: z.string().regex(/^kn_evd_[0-9a-f-]{36}$/i),
	organizationId: institutionalUuidSchema,
	claimTextHash: z.string().min(32).max(128),
	provenanceKind: evidenceProvenanceKindSchema,
	sourceRefs: z.array(evidenceSourceRefSchema).min(1),
	recordedAt: z.string().datetime(),
});
export const documentIndexedPayloadSchema = z.object({
	documentId: documentIdSchema,
	documentVersionId: documentVersionIdSchema,
	indexGenerationId: indexGenerationIdSchema,
	organizationId: institutionalUuidSchema,
	contentHash: z.string().min(32).max(128),
});
export const chunkEmbeddedPayloadSchema = z.object({
	chunkId: chunkIdSchema,
	documentVersionId: documentVersionIdSchema,
	embeddingSpaceId: embeddingSpaceIdSchema,
	dimensions: z.number().int().positive(),
});
export const documentAccessRevokedPayloadSchema = z.object({
	documentId: documentIdSchema,
	organizationId: institutionalUuidSchema,
	revokedAt: z.string().datetime(),
	aclEpoch: z.number().int().nonnegative(),
});
export const memoryPromotedPayloadSchema = z.object({
	memoryEntryId: z.string().regex(/^kn_mem_[0-9a-f-]{36}$/i),
	organizationId: institutionalUuidSchema,
	contentHash: z.string().min(32).max(128),
	promotedAt: z.string().datetime(),
});
export const knowledgeEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(KNOWLEDGE_EVENT_TYPES.DOCUMENT_INDEXED),
		payload: documentIndexedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(KNOWLEDGE_EVENT_TYPES.CHUNK_EMBEDDED),
		payload: chunkEmbeddedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(KNOWLEDGE_EVENT_TYPES.DOCUMENT_ACCESS_REVOKED),
		payload: documentAccessRevokedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(KNOWLEDGE_EVENT_TYPES.MEMORY_PROMOTED),
		payload: memoryPromotedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(KNOWLEDGE_EVENT_TYPES.EVIDENCE_RECORDED),
		payload: evidenceRecordedPayloadSchema,
	}),
]);

export type KnowledgeEventType =
	(typeof KNOWLEDGE_EVENT_TYPES)[keyof typeof KNOWLEDGE_EVENT_TYPES];
