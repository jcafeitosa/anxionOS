import type { NodeKey } from "@anxionos/contracts/graph";
import { formatNodeKey } from "../../domain/node-key";

export function createPendingProjectionRegistry(): PendingProjectionRegistry {
    const entries = new Map();
    return {
        register(nodeKey, expectedGeneration) {
            entries.set(formatNodeKey(nodeKey), { expectedGeneration });
        },
        get(nodeKey) {
            return entries.get(formatNodeKey(nodeKey));
        },
        clear() {
            entries.clear();
        },
    };
}

export interface PendingProjection {
    expectedGeneration: number;
}

export interface PendingProjectionRegistry {
    register(nodeKey: NodeKey, expectedGeneration: number): void;
    get(nodeKey: NodeKey): PendingProjection | undefined;
    clear(): void;
}
