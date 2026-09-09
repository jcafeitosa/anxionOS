import { z } from "zod";
import { chunkIdSchema, documentIdSchema, documentVersionIdSchema, embeddingSpaceIdSchema, indexGenerationIdSchema, } from "./types";
export const KNOWLEDGE_EVENT_TYPES = {
    DOCUMENT_INDEXED: "knowledge.document.indexed.v1",
    CHUNK_EMBEDDED: "knowledge.chunk.embedded.v1",
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
export const knowledgeEventPayloadSchema = z.discriminatedUnion("eventType", [
    z.object({
        eventType: z.literal(KNOWLEDGE_EVENT_TYPES.DOCUMENT_INDEXED),
        payload: documentIndexedPayloadSchema,
    }),
    z.object({
        eventType: z.literal(KNOWLEDGE_EVENT_TYPES.CHUNK_EMBEDDED),
        payload: chunkEmbeddedPayloadSchema,
    }),
]);

export type KnowledgeEventType = (typeof KNOWLEDGE_EVENT_TYPES)[keyof typeof KNOWLEDGE_EVENT_TYPES];
