import { z } from "zod";
export const CACHEABLE_TRAVERSAL_IDS = ["T01", "T03", "T15"] as const;
export const cacheableTraversalIdSchema = z.enum(CACHEABLE_TRAVERSAL_IDS);
export const cachePolicySchema = z.enum(["never", "conditional", "always"]);
export const graphCacheKeyPartsSchema = z.object({
    traversalId: cacheableTraversalIdSchema,
    scopeHash: z.string().min(1),
    queryHash: z.string().min(1),
    authorityEpoch: z.number().int().nonnegative(),
    riskEpoch: z.number().int().nonnegative(),
    catalogGeneration: z.number().int().nonnegative(),
    offerGeneration: z.number().int().nonnegative().optional(),
    intentHash: z.string().min(1).optional(),
});
export const graphCacheInvalidateSchema = z.object({
    v: z.literal(1),
    scopeType: z.enum(["PLATFORM", "ORGANIZATION", "AGENCY", "USER"]),
    scopeId: z.string().uuid(),
    reason: z.string(),
    authorityEpoch: z.number().int().nonnegative(),
    riskEpoch: z.number().int().nonnegative(),
    at: z.string().datetime(),
});
export const GRAPH_CACHE_TTL_SECONDS = {
    T01_DENY: 60,
    T03_DENY: 60,
    T15: 300,
    L1: 30,
    NEGATIVE: 15,
};
export function buildGraphCacheRedisKey(parts: GraphCacheKeyParts): string {
    const base = [
        "graph:cache:v1",
        parts.traversalId,
        parts.scopeHash,
        parts.queryHash,
        parts.authorityEpoch,
        parts.riskEpoch,
        parts.catalogGeneration,
    ].join(":");
    if (parts.offerGeneration !== undefined) {
        return `${base}:og:${parts.offerGeneration}`;
    }
    return base;
}
export function shouldCacheT01Decision(decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL", intentHash?: string): boolean {
    if (intentHash) {
        return false;
    }
    return decision !== "ALLOW";
}

export type CacheableTraversalId = (typeof CACHEABLE_TRAVERSAL_IDS)[number];

export type CachePolicy = z.infer<typeof cachePolicySchema>;
export type GraphCacheKeyParts = z.infer<typeof graphCacheKeyPartsSchema>;
export type GraphCacheInvalidate = z.infer<typeof graphCacheInvalidateSchema>;
