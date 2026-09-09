import { z } from "zod";
export const KNOWLEDGE_OWNER_DOMAIN = "knowledge";
export const knowledgeSourceIdSchema = z.string().regex(/^kn_src_[0-9a-f-]{36}$/i);
export const documentIdSchema = z.string().regex(/^kn_doc_[0-9a-f-]{36}$/i);
export const documentVersionIdSchema = z.string().regex(/^kn_dver_[0-9a-f-]{36}$/i);
export const chunkIdSchema = z.string().regex(/^kn_chk_[0-9a-f-]{36}$/i);
export const indexGenerationIdSchema = z.string().regex(/^kn_idx_[0-9a-f-]{36}$/i);
export const embeddingSpaceIdSchema = z.string().regex(/^kn_espc_[0-9a-f-]{36}$/i);
export const knowledgeSourceKindSchema = z.enum([
    "UPLOAD",
    "URL",
    "CONNECTION_SYNC",
    "RUN_ARTIFACT",
    "MANUAL_RESEARCH",
]);
export const knowledgeSourceStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]);
export const documentStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "RETENTION_HOLD"]);
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
    aclId: z.string().uuid(),
    epoch: z.number().int().nonnegative(),
});
export class KnowledgeContractError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "KnowledgeContractError";
    }
}
const FORBIDDEN_EVENT_KEYS = ["embedding", "embeddings", "vector", "apiKey", "secret"];
export function assertKnowledgeEventPayloadSafe(payload: Record<string, unknown>): void {
    for (const key of Object.keys(payload)) {
        if (FORBIDDEN_EVENT_KEYS.some((f) => key.toLowerCase().includes(f))) {
            throw new KnowledgeContractError(`KN_FORBIDDEN_PAYLOAD_KEY:${key}`);
        }
    }
}
