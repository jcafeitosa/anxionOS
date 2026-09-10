import { z } from "zod";
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
};
export const documentIndexedPayloadSchema = z.object({
	documentId: documentIdSchema,
	documentVersionId: documentVersionIdSchema,
	indexGenerationId: indexGenerationIdSchema,
	organizationId: z.string().uuid(),
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
	organizationId: z.string().uuid(),
	revokedAt: z.string().datetime(),
	aclEpoch: z.number().int().nonnegative(),
});
export const memoryPromotedPayloadSchema = z.object({
	memoryEntryId: z.string().regex(/^kn_mem_[0-9a-f-]{36}$/i),
	organizationId: z.string().uuid(),
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
]);

export type KnowledgeEventType =
	(typeof KNOWLEDGE_EVENT_TYPES)[keyof typeof KNOWLEDGE_EVENT_TYPES];
