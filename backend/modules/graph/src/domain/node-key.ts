import type { NodeKey } from "@anxionos/contracts/graph";

const NODE_KEY_SEPARATOR = ":";
/** Canonical NodeKey string for graph storage and constraints (R03 envelope). */
export function formatNodeKey(nodeKey: NodeKey): string {
    return [
        nodeKey.scopeType,
        nodeKey.scopeId,
        nodeKey.type,
        nodeKey.id,
    ].join(NODE_KEY_SEPARATOR);
}
export function parseNodeKey(key: string): NodeKey {
    const parts = key.split(NODE_KEY_SEPARATOR);
    if (parts.length !== 4) {
        throw new Error(`Invalid node key format: ${key}`);
    }
    const [scopeType, scopeId, type, id] = parts;
    return {
        scopeType: scopeType as import("@anxionos/contracts/graph").NodeKey["scopeType"],
        scopeId,
        type,
        id,
    };
}
