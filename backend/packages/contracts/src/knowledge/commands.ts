import { z } from "zod";
import {
	aclRefSchema,
	blobRefSchema,
	dataClassificationSchema,
	documentIdSchema,
	embeddingSpaceIdSchema,
	indexGenerationIdSchema,
	knowledgeSourceIdSchema,
	knowledgeSourceKindSchema,
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
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	displayName: z.string().min(1).max(256),
	sourceKind: knowledgeSourceKindSchema,
	defaultClassification: dataClassificationSchema,
	defaultAclRef: aclRefSchema,
});
export const ingestDocumentCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
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
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	documentId: documentIdSchema,
	indexGenerationId: indexGenerationIdSchema,
	expectedRevision: z.number().int().nonnegative(),
});

export type KnowledgeCommandResult = z.infer<
	typeof knowledgeCommandResultSchema
>;

export type RegisterKnowledgeSourceCommand = z.infer<
	typeof registerKnowledgeSourceCommandSchema
>;

export type IngestDocumentCommand = z.infer<typeof ingestDocumentCommandSchema>;

export type PublishIndexCommand = z.infer<typeof publishIndexCommandSchema>;
