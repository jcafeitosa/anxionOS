import type { NodeKey } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import { evaluateT02Temporal } from "../t02-temporal-evaluation";

export const GRAPH_TRAVERSAL_INVALID_TEMPORAL = "GRAPH_TRAVERSAL_INVALID_TEMPORAL";
export const GRAPH_TRAVERSAL_ANCHOR_NOT_FOUND = "GRAPH_TRAVERSAL_ANCHOR_NOT_FOUND";

export function guardTemporal(validAt: string, knownAt?: string) {
	const temporal = evaluateT02Temporal({ params: { validAt }, knownAt });
	if (!temporal.complete) {
		return {
			complete: false as const,
			incompleteReasons: [
				GRAPH_TRAVERSAL_INVALID_TEMPORAL,
				...(temporal.reasons ?? []),
			],
		};
	}
	return null;
}

export async function requireAnchorNode(
	graphStore: GraphStore,
	nodeKey: NodeKey,
	expectedType: string,
) {
	const node = await graphStore.getNode(nodeKey);
	if (!node || node.nodeKey.type !== expectedType) {
		return {
			complete: false as const,
			incompleteReasons: [GRAPH_TRAVERSAL_ANCHOR_NOT_FOUND],
		};
	}
	return node;
}

export async function collectNeighborIds(
	graphStore: GraphStore,
	startNodeKey: NodeKey,
	edgeTypes: string[],
	direction: "IN" | "OUT",
	expectedType: string,
): Promise<string[]> {
	const ids = new Set<string>();
	const neighbors = await graphStore.listNeighbors({
		startNodeKey,
		edgeTypes,
		direction,
		maxResults: 256,
	});
	for (const edge of neighbors) {
		if (edge.targetNodeKey.type === expectedType) {
			ids.add(edge.targetNodeKey.id);
		}
	}
	return [...ids];
}
