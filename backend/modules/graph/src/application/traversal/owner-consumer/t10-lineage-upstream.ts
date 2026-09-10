import type { T10Input, T10Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import {
	collectNeighborIds,
	guardTemporal,
	requireAnchorNode,
} from "./traversal-common";

const T10_EDGES = {
	MADE_BY: "MADE_BY",
	BASED_ON: "BASED_ON",
	USES_CONTEXT: "USES_CONTEXT",
} as const;

export async function evaluateT10LineageUpstream(
	graphStore: GraphStore,
	input: T10Input,
	knownAt?: string,
): Promise<T10Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			agentIds: [],
			knowledgeRefIds: [],
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(
		graphStore,
		input.decisionNodeKey,
		"Decision",
	);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			agentIds: [],
			knowledgeRefIds: [],
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const agentIds = await collectNeighborIds(
		graphStore,
		input.decisionNodeKey,
		[T10_EDGES.MADE_BY],
		"OUT",
		"Agent",
	);
	const evidenceIds = await collectNeighborIds(
		graphStore,
		input.decisionNodeKey,
		[T10_EDGES.BASED_ON],
		"OUT",
		"Evidence",
	);
	const contextIds = await collectNeighborIds(
		graphStore,
		input.decisionNodeKey,
		[T10_EDGES.USES_CONTEXT],
		"OUT",
		"ContextManifest",
	);

	return {
		complete: true,
		agentIds,
		knowledgeRefIds: [...evidenceIds, ...contextIds],
	};
}
