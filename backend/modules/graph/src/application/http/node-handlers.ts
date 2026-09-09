import { type NodeGetResponse, type NodesBatchGetResponse, type ScopeContext } from "@anxionos/contracts/graph";
import type { GraphHttpRuntime } from "./graph-runtime";
import { NODES_BATCH_GET_MAX_KEYS, nodeGetQuerySchema, nodeKeySchema, nodesBatchGetInputSchema, } from "@anxionos/contracts/graph";
import { parseNodeKey } from "../../domain/node-key";
import { applyFieldMask } from "./field-mask";
import { GraphHttpError } from "./graph-http-error";
import { assertNodeReadable } from "./scope-enforcement";
import { buildNodeEtag, toNodeProjectionDto } from "./node-to-dto";

function parseNodeKeyParam(encodedKey) {
    try {
        const decoded = decodeURIComponent(encodedKey);
        return nodeKeySchema.parse(parseNodeKey(decoded));
    }
    catch {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", "Invalid nodeKey path parameter");
    }
}
export async function handleNodeGet(runtime, nodeKeyParam, query, scope) {
    const nodeKey = parseNodeKeyParam(nodeKeyParam);
    const parsedQuery = nodeGetQuerySchema.safeParse({
        minProjectionGeneration: query.minProjectionGeneration
            ? Number(query.minProjectionGeneration)
            : undefined,
        validAt: query.validAt,
        knownAt: query.knownAt,
    });
    if (!parsedQuery.success) {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", "Invalid node.get query parameters", parsedQuery.error.flatten());
    }
    assertNodeReadable(scope, nodeKey);
    const record = await runtime.graphStore.getNode(nodeKey);
    const pending = runtime.pendingProjections.get(nodeKey);
    const minGeneration = parsedQuery.data.minProjectionGeneration;
    if (!record) {
        if (pending && minGeneration !== undefined) {
            throw new GraphHttpError("NODE_NOT_PROJECTED", "Node accepted but projection is pending", {
                nodeKey,
                expectedProjectionGeneration: pending.expectedGeneration,
            });
        }
        throw new GraphHttpError("NODE_NOT_FOUND", "Node not found", { nodeKey });
    }
    if (minGeneration !== undefined &&
        record.projectionGeneration < minGeneration) {
        throw new GraphHttpError("NODE_NOT_PROJECTED", "Node projection generation below requested minimum", {
            nodeKey,
            projectionGeneration: record.projectionGeneration,
            minProjectionGeneration: minGeneration,
        });
    }
    const checkpoint = await runtime.getCheckpoint();
    const node = toNodeProjectionDto(record, checkpoint);
    return {
        node,
        etag: buildNodeEtag(checkpoint, node.projectionGeneration),
    };
}
export async function handleNodesBatchGet(runtime, body, scope) {
    const parsed = nodesBatchGetInputSchema.safeParse(body);
    if (!parsed.success) {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", "Invalid nodes.batchGet payload", parsed.error.flatten());
    }
    const { keys, minProjectionGeneration, fieldMask } = parsed.data;
    if (keys.length > NODES_BATCH_GET_MAX_KEYS) {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", `nodes.batchGet accepts at most ${NODES_BATCH_GET_MAX_KEYS} keys`, { keyCount: keys.length, maxKeys: NODES_BATCH_GET_MAX_KEYS });
    }
    for (const nodeKey of keys) {
        assertNodeReadable(scope, nodeKey);
    }
    const records = await runtime.graphStore.getNodes(keys);
    const recordByKey = new Map(records.map((record) => [
        `${record.nodeKey.scopeType}:${record.nodeKey.scopeId}:${record.nodeKey.type}:${record.nodeKey.id}`,
        record,
    ]));
    const checkpoint = await runtime.getCheckpoint();
    const entries: NodesBatchGetResponse["entries"] = [];
    for (const nodeKey of keys) {
        const key = `${nodeKey.scopeType}:${nodeKey.scopeId}:${nodeKey.type}:${nodeKey.id}`;
        const record = recordByKey.get(key);
        if (!record) {
            continue;
        }
        if (minProjectionGeneration !== undefined &&
            record.projectionGeneration < minProjectionGeneration) {
            continue;
        }
        const dto = toNodeProjectionDto(record, checkpoint);
        if (fieldMask?.length) {
            dto.payload = applyFieldMask(dto.payload, fieldMask);
        }
        entries.push({ nodeKey, node: dto });
    }
    return { entries };
}
