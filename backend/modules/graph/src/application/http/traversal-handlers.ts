import { type GraphQueryResult, type ScopeContext } from "@anxionos/contracts/graph";
import type { GraphHttpRuntime } from "./graph-runtime";
import { type GraphTraversalRateLimiter } from "./graph-rate-limit";
import type { TraversalEvaluatorId } from "../../domain/ports/traversal-evaluator";
import { randomUUID } from "node:crypto";
import { graphQueryEnvelopeSchema, T01_INPUT_SCHEMA, T01_OUTPUT_SCHEMA, T02_INPUT_SCHEMA, T02_OUTPUT_SCHEMA, T03_OUTPUT_SCHEMA, T04_INPUT_SCHEMA, T04_OUTPUT_SCHEMA, T05_INPUT_SCHEMA, T05_OUTPUT_SCHEMA, TRAVERSAL_T01_META, TRAVERSAL_T02_META, TRAVERSAL_T03_META, TRAVERSAL_T04_META, TRAVERSAL_T05_META, } from "@anxionos/contracts/graph";
import { getOrLoadGraphCacheValue } from "../cache/cache-aside";
import { GraphHttpError } from "./graph-http-error";
import { assertEnvelopeScopeMatches } from "./scope-enforcement";
import { buildTraversalRateLimitKey, } from "./graph-rate-limit";

const TRAVERSAL_META = {
    T01: TRAVERSAL_T01_META,
    T02: TRAVERSAL_T02_META,
    T03: TRAVERSAL_T03_META,
    T04: TRAVERSAL_T04_META,
    T05: TRAVERSAL_T05_META,
};
const TRAVERSAL_INPUT_SCHEMAS = {
    T01: T01_INPUT_SCHEMA,
    T02: T02_INPUT_SCHEMA,
    T03: T01_INPUT_SCHEMA,
    T04: T04_INPUT_SCHEMA,
    T05: T05_INPUT_SCHEMA,
};
const TRAVERSAL_OUTPUT_SCHEMAS = {
    T01: T01_OUTPUT_SCHEMA,
    T02: T02_OUTPUT_SCHEMA,
    T03: T03_OUTPUT_SCHEMA,
    T04: T04_OUTPUT_SCHEMA,
    T05: T05_OUTPUT_SCHEMA,
};
const TRAVERSAL_IDS = new Set(["T01", "T02", "T03", "T04", "T05"]);
function assertTraversalId(value) {
    if (TRAVERSAL_IDS.has(value)) {
        return value;
    }
    throw new GraphHttpError("TRAVERSAL_NOT_FOUND", `Traversal not found: ${value}`);
}
function parseTraversalParams(traversalId, params) {
    const parsed = TRAVERSAL_INPUT_SCHEMAS[traversalId].safeParse(params);
    if (!parsed.success) {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", `Invalid ${traversalId} params`, parsed.error.flatten());
    }
    return parsed.data;
}
export function assertTraversalRateLimit(rateLimiter: GraphTraversalRateLimiter, principalId: string, traversalId: TraversalEvaluatorId | "neighbors"): void {
    const key = buildTraversalRateLimitKey(principalId, traversalId);
    if (!rateLimiter.check(key)) {
        throw new GraphHttpError("RATE_LIMITED", "Traversal rate limit exceeded", { traversalId, limitPerMinute: 60 });
    }
}
export async function handleTraversal(runtime, traversalIdParam, body, scope, requestId) {
    const traversalId = assertTraversalId(traversalIdParam);
    assertTraversalRateLimit(runtime.rateLimiter, scope.principalId, traversalId);
    const envelopeParsed = graphQueryEnvelopeSchema.safeParse(body);
    if (!envelopeParsed.success) {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", "Invalid GraphQuery envelope", envelopeParsed.error.flatten());
    }
    const envelope = envelopeParsed.data;
    assertEnvelopeScopeMatches(scope, envelope.scope);
    const traversalInput = parseTraversalParams(traversalId, envelope.params);
    const catalogEntry = runtime.catalog.getTraversal(traversalId, TRAVERSAL_META[traversalId].queryVersion);
    if (!catalogEntry) {
        throw new GraphHttpError("TRAVERSAL_NOT_FOUND", `Traversal not registered: ${traversalId}`);
    }
    const catalogGeneration = await runtime.getRegistryGeneration();
    const queryId = randomUUID();
    const intentHash = "intentHash" in traversalInput ? traversalInput.intentHash : undefined;
    const authorityEpoch = "expectedAuthorityEpoch" in traversalInput
        ? traversalInput.expectedAuthorityEpoch
        : catalogGeneration;
    const riskEpoch = "expectedRiskEpoch" in traversalInput ? traversalInput.expectedRiskEpoch : 0;
    const cacheLookupInput = {
        traversalId,
        scopeType: scope.actingScope.scopeType,
        scopeId: scope.actingScope.scopeId,
        principalId: scope.principalId,
        queryParams: envelope.params,
        authorityEpoch: authorityEpoch ?? catalogGeneration,
        riskEpoch: riskEpoch ?? 0,
        catalogGeneration,
        intentHash,
    };
    const evaluateTraversal = async () => {
        const result = await runtime.traversalEvaluator.evaluate({
            traversalId,
            input: traversalInput,
            scope,
        });
        const outputSchema = TRAVERSAL_OUTPUT_SCHEMAS[traversalId];
        return {
            ...result,
            data: outputSchema.parse(result.data),
        };
    };
    let evaluation;
    let cacheHit = false;
    if (intentHash) {
        evaluation = await evaluateTraversal();
    }
    else if (traversalId === "T01") {
        const denyCacheInput = {
            ...cacheLookupInput,
            decision: "DENY",
        };
        const cached = await getOrLoadGraphCacheValue(runtime.cache, denyCacheInput, evaluateTraversal);
        evaluation = cached.value;
        cacheHit = cached.cacheHit;
        if (!cacheHit && evaluation.data.decision !== "DENY") {
            cacheHit = false;
        }
    }
    else if (TRAVERSAL_META[traversalId].cacheable === "never") {
        evaluation = await evaluateTraversal();
    }
    else {
        const cached = await getOrLoadGraphCacheValue(runtime.cache, cacheLookupInput, evaluateTraversal);
        evaluation = cached.value;
        cacheHit = cached.cacheHit;
    }
    return {
        meta: {
            queryId,
            traversalId,
            queryVersion: catalogEntry.queryVersion,
            requestId,
            validAt: envelope.temporal.validAt,
            knownAt: envelope.temporal.knownAt,
            projectionGeneration: evaluation.projectionGeneration,
            checkpoint: evaluation.checkpoint,
            complete: true,
            cached: cacheHit,
        },
        data: evaluation.data,
    };
}
