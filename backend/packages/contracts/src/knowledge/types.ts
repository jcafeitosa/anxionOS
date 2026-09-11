import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
export const KNOWLEDGE_OWNER_DOMAIN = "knowledge";
export const knowledgeSourceIdSchema = z
	.string()
	.regex(/^kn_src_[0-9a-f-]{36}$/i);
export const documentIdSchema = z.string().regex(/^kn_doc_[0-9a-f-]{36}$/i);
export const documentVersionIdSchema = z
	.string()
	.regex(/^kn_dver_[0-9a-f-]{36}$/i);
export const chunkIdSchema = z.string().regex(/^kn_chk_[0-9a-f-]{36}$/i);
export const indexGenerationIdSchema = z
	.string()
	.regex(/^kn_idx_[0-9a-f-]{36}$/i);
export const embeddingSpaceIdSchema = z
	.string()
	.regex(/^kn_espc_[0-9a-f-]{36}$/i);
export const knowledgeSourceKindSchema = z.enum([
	"UPLOAD",
	"URL",
	"CONNECTION_SYNC",
	"RUN_ARTIFACT",
	"MANUAL_RESEARCH",
]);
export const knowledgeSourceStatusSchema = z.enum([
	"ACTIVE",
	"SUSPENDED",
	"ARCHIVED",
]);
export const documentStatusSchema = z.enum([
	"DRAFT",
	"ACTIVE",
	"ARCHIVED",
	"RETENTION_HOLD",
]);
export const dataClassificationSchema = z.enum([
	"PUBLIC",
	"INTERNAL",
	"CONFIDENTIAL",
	"RESTRICTED",
]);
export const blobRefSchema = z.object({
	bucket: z.string().min(1).max(128),
	objectKey: z.string().min(1).max(512),
	contentHash: z.string().min(32).max(128),
});
export const aclRefSchema = z.object({
	aclId: institutionalUuidSchema,
	epoch: z.number().int().nonnegative(),
});
export const memoryEntryIdSchema = z.string().regex(/^kn_mem_[0-9a-f-]{36}$/i);
export const memoryTierSchema = z.enum(["CANDIDATE", "PROMOTED"]);
export const retrievalHitSchema = z.object({
	chunkId: chunkIdSchema,
	documentId: documentIdSchema,
	documentVersionId: documentVersionIdSchema,
	contentHash: z.string().min(32).max(128),
	textPreview: z.string().max(512),
	score: z.number().min(0).max(1),
	provenance: z.object({
		sourceTitle: z.string().max(512),
		classification: dataClassificationSchema,
		aclId: institutionalUuidSchema,
		aclEpoch: z.number().int().nonnegative(),
	}),
});
export const contextManifestSchema = z.object({
	manifestId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	queryHash: z.string().min(32).max(128),
	hits: z.array(retrievalHitSchema),
	generatedAt: z.string().datetime(),
});
export type RetrievalHit = z.infer<typeof retrievalHitSchema>;
export type ContextManifest = z.infer<typeof contextManifestSchema>;
export class KnowledgeContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "KnowledgeContractError";
	}
}
const FORBIDDEN_EVENT_KEYS = [
	"embedding",
	"embeddings",
	"vector",
	"apiKey",
	"secret",
];
export function assertKnowledgeEventPayloadSafe(
	payload: Record<string, unknown>,
): void {
	for (const key of Object.keys(payload)) {
		if (FORBIDDEN_EVENT_KEYS.some((f) => key.toLowerCase().includes(f))) {
			throw new KnowledgeContractError(`KN_FORBIDDEN_PAYLOAD_KEY:${key}`);
		}
	}
}
