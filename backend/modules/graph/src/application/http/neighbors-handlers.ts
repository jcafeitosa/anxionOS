import { type GraphQueryResult, type ScopeContext } from "@anxionos/contracts/graph";
import type { GraphHttpRuntime } from "./graph-runtime";
import { randomUUID } from "node:crypto";
import { graphQueryEnvelopeSchema, neighborsTraversalDataSchema, neighborsTraversalInputSchema, } from "@anxionos/contracts/graph";
import { GraphHttpError } from "./graph-http-error";
import { assertEnvelopeScopeMatches, assertNodeReadable, isNodeReadable, } from "./scope-enforcement";
import { assertTraversalRateLimit } from "./traversal-handlers";

const NEIGHBORS_TRAVERSAL_ID = "neighbors";
const NEIGHBORS_QUERY_VERSION = 1;
export async function handleTraversalNeighbors(runtime, body, scope, requestId) {
    assertTraversalRateLimit(runtime.rateLimiter, scope.principalId, NEIGHBORS_TRAVERSAL_ID);
    const envelopeParsed = graphQueryEnvelopeSchema.safeParse(body);
    if (!envelopeParsed.success) {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", "Invalid GraphQuery envelope", envelopeParsed.error.flatten());
    }
    const envelope = envelopeParsed.data;
    const paramsParsed = neighborsTraversalInputSchema.safeParse(envelope.params);
    if (!paramsParsed.success) {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", "Invalid neighbors traversal params", paramsParsed.error.flatten());
    }
    assertEnvelopeScopeMatches(scope, envelope.scope);
    const params = paramsParsed.data;
    assertNodeReadable(scope, params.startNodeKey);
    const startRecord = await runtime.graphStore.getNode(params.startNodeKey);
    if (!startRecord) {
        throw new GraphHttpError("NODE_NOT_FOUND", "Start node not found", {
            nodeKey: params.startNodeKey,
        });
    }
    const rawNeighbors = await runtime.graphStore.listNeighbors({
        startNodeKey: params.startNodeKey,
        edgeTypes: params.edgeTypes,
        direction: params.direction,
        maxResults: params.maxResults,
    });
    const neighbors = rawNeighbors.filter((neighbor) => isNodeReadable(scope, neighbor.targetNodeKey));
    const data = neighborsTraversalDataSchema.parse({
        startNodeKey: params.startNodeKey,
        neighbors,
        truncated: rawNeighbors.length >= params.maxResults,
    });
    const checkpoint = await runtime.getCheckpoint();
    return {
        meta: {
            queryId: randomUUID(),
            traversalId: NEIGHBORS_TRAVERSAL_ID,
            queryVersion: NEIGHBORS_QUERY_VERSION,
            requestId,
            validAt: envelope.temporal.validAt,
            knownAt: envelope.temporal.knownAt,
            projectionGeneration: startRecord.projectionGeneration,
            checkpoint,
            complete: true,
            cached: false,
        },
        data,
    };
}
