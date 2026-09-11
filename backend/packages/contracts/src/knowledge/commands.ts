import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	aclRefSchema,
	blobRefSchema,
	dataClassificationSchema,
	documentIdSchema,
	embeddingSpaceIdSchema,
	indexGenerationIdSchema,
	knowledgeSourceIdSchema,
	knowledgeSourceKindSchema,
	memoryEntryIdSchema,
} from "./types";
export const knowledgeCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	documentId: documentIdSchema.optional(),
	documentVersionId: z.string().optional(),
	indexGenerationId: indexGenerationIdSchema.optional(),
});
export const registerKnowledgeSourceCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	displayName: z.string().min(1).max(256),
	sourceKind: knowledgeSourceKindSchema,
	defaultClassification: dataClassificationSchema,
	defaultAclRef: aclRefSchema,
});
export const ingestDocumentCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	knowledgeSourceId: knowledgeSourceIdSchema,
	title: z.string().min(1).max(512),
	classification: dataClassificationSchema,
	aclRef: aclRefSchema,
	blobRef: blobRefSchema,
	mimeType: z.string().min(1).max(128),
	byteSize: z.number().int().nonnegative(),
	plainText: z.string().min(1).max(1_000_000),
	embeddingSpaceId: embeddingSpaceIdSchema,
});
export const publishIndexCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	documentId: documentIdSchema,
	indexGenerationId: indexGenerationIdSchema,
	expectedRevision: z.number().int().nonnegative(),
});
export const revokeDocumentAccessCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	documentId: documentIdSchema,
	revokedAt: z.string().datetime(),
	reason: z.string().min(1).max(256).optional(),
});
export const retrieveKnowledgeQuerySchema = z.object({
	organizationId: institutionalUuidSchema,
	queryText: z.string().min(1).max(8_000),
	aclRef: aclRefSchema,
	embeddingSpaceId: embeddingSpaceIdSchema,
	limit: z.number().int().min(1).max(50).default(5),
});
export const registerCandidateMemoryCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	summary: z.string().min(1).max(4_000),
	contentHash: z.string().min(32).max(128),
	sourceDocumentId: documentIdSchema.optional(),
});
export const promoteCandidateMemoryCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	memoryEntryId: memoryEntryIdSchema,
	promotedAt: z.string().datetime(),
});

export type KnowledgeCommandResult = z.infer<
	typeof knowledgeCommandResultSchema
>;

export type RegisterKnowledgeSourceCommand = z.infer<
	typeof registerKnowledgeSourceCommandSchema
>;

export type IngestDocumentCommand = z.infer<typeof ingestDocumentCommandSchema>;

export type PublishIndexCommand = z.infer<typeof publishIndexCommandSchema>;

export type RevokeDocumentAccessCommand = z.infer<
	typeof revokeDocumentAccessCommandSchema
>;

export type RetrieveKnowledgeQuery = z.infer<
	typeof retrieveKnowledgeQuerySchema
>;

export type RegisterCandidateMemoryCommand = z.infer<
	typeof registerCandidateMemoryCommandSchema
>;

export type PromoteCandidateMemoryCommand = z.infer<
	typeof promoteCandidateMemoryCommandSchema
>;
