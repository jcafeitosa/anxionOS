import type { NodeKey } from "@anxionos/contracts/graph";

export interface GraphNeighborEdge {
    edgeType: string;
    direction: "OUT" | "IN";
    targetNodeKey: NodeKey;
}
export interface NeighborQuery {
    startNodeKey: NodeKey;
    edgeTypes?: string[];
    direction: "OUT" | "IN" | "BOTH";
    maxResults: number;
}
export interface GraphNodeRecord {
    nodeKey: NodeKey;
    schemaVersion: number;
    ownerDomain: string;
    status: string;
    revision: number;
    projectionGeneration: number;
    payload: Record<string, unknown>;
}
/** Port for Neo4j-backed graph store (S3 adapter). */
export interface GraphStore {
    getNode(nodeKey: NodeKey): Promise<GraphNodeRecord | null>;
    getNodes(nodeKeys: NodeKey[]): Promise<GraphNodeRecord[]>;
    upsertNode(record: GraphNodeRecord, eventId: string): Promise<void>;
    deleteNode(nodeKey: NodeKey, eventId: string): Promise<void>;
    listNeighbors(query: NeighborQuery): Promise<GraphNeighborEdge[]>;
}
