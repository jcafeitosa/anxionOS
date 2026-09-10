import type {
	GraphEdgeRecord,
	GraphNeighborEdge,
	GraphNodeRecord,
	GraphStore,
	NeighborQuery,
} from "../../domain/ports/graph-store";
export interface InMemoryGraphEdge {
	edgeType: string;
	from: GraphNodeRecord["nodeKey"];
	to: GraphNodeRecord["nodeKey"];
}
import { formatNodeKey } from "../../domain/node-key";

function listNeighborsFromEdges(
	edges: InMemoryGraphEdge[],
	query: NeighborQuery,
) {
	const startKey = formatNodeKey(query.startNodeKey);
	const results: GraphNeighborEdge[] = [];
	for (const edge of edges) {
		const fromKey = formatNodeKey(edge.from);
		const toKey = formatNodeKey(edge.to);
		if (query.direction !== "IN" && fromKey === startKey) {
			if (!query.edgeTypes || query.edgeTypes.includes(edge.edgeType)) {
				results.push({
					edgeType: edge.edgeType,
					direction: "OUT",
					targetNodeKey: edge.to,
				});
			}
		}
		if (query.direction !== "OUT" && toKey === startKey) {
			if (!query.edgeTypes || query.edgeTypes.includes(edge.edgeType)) {
				results.push({
					edgeType: edge.edgeType,
					direction: "IN",
					targetNodeKey: edge.from,
				});
			}
		}
		if (results.length >= query.maxResults) {
			break;
		}
	}
	return results.slice(0, query.maxResults);
}
function edgeIdentity(edge: InMemoryGraphEdge) {
	return `${formatNodeKey(edge.from)}|${edge.edgeType}|${formatNodeKey(edge.to)}`;
}
function upsertInMemoryEdge(
	edgeList: InMemoryGraphEdge[],
	record: GraphEdgeRecord,
) {
	const next: InMemoryGraphEdge = {
		edgeType: record.edgeType,
		from: record.fromNodeKey,
		to: record.toNodeKey,
	};
	const key = edgeIdentity(next);
	const index = edgeList.findIndex((edge) => edgeIdentity(edge) === key);
	if (index >= 0) {
		edgeList[index] = next;
		return;
	}
	edgeList.push(next);
}
export function createInMemoryGraphStore(
	seed: GraphNodeRecord[] = [],
	edges: InMemoryGraphEdge[] = [],
): GraphStore & {
	records: Map<string, GraphNodeRecord>;
	edges: InMemoryGraphEdge[];
} {
	const records = new Map();
	for (const record of seed) {
		records.set(formatNodeKey(record.nodeKey), record);
	}
	return {
		records,
		async getNode(nodeKey) {
			return records.get(formatNodeKey(nodeKey)) ?? null;
		},
		async getNodes(nodeKeys) {
			return nodeKeys
				.map((key) => records.get(formatNodeKey(key)) ?? null)
				.filter((record) => record !== null);
		},
		async upsertNode(record, _eventId) {
			records.set(formatNodeKey(record.nodeKey), record);
		},
		async upsertEdge(record, _eventId) {
			upsertInMemoryEdge(edges, record);
		},
		async deleteNode(nodeKey, _eventId) {
			records.delete(formatNodeKey(nodeKey));
		},
		async listNeighbors(query) {
			return listNeighborsFromEdges(edges, query);
		},
		edges,
	};
}

export interface InMemoryGraphEdge {
	edgeType: string;
	from: GraphNodeRecord["nodeKey"];
	to: GraphNodeRecord["nodeKey"];
}
