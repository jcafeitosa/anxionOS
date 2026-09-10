import type { T12Input, T12Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../domain/ports/graph-store";
import { evaluateT02Temporal } from "./t02-temporal-evaluation";

export const GRAPH_T12_INCOMPLETE_REASONS = {
	OUTCOME_NOT_FOUND: "GRAPH_T12_OUTCOME_NOT_FOUND",
	INVALID_TEMPORAL_CONTEXT: "GRAPH_T12_INVALID_TEMPORAL_CONTEXT",
} as const;

const T12_EDGES = {
	ATTRIBUTES_OUTCOME: "ATTRIBUTES_OUTCOME",
	CONTRIBUTION_FROM: "CONTRIBUTION_FROM",
} as const;

export async function evaluateT12OutcomeAttribution(
	graphStore: GraphStore,
	input: T12Input,
	knownAt?: string,
): Promise<T12Output> {
	const temporal = evaluateT02Temporal({
		params: { validAt: input.validAt },
		knownAt,
	});
	if (!temporal.complete) {
		return {
			complete: false,
			fillIds: [],
			incompleteReasons: [
				GRAPH_T12_INCOMPLETE_REASONS.INVALID_TEMPORAL_CONTEXT,
				...(temporal.reasons ?? []),
			],
		};
	}

	const outcome = await graphStore.getNode(input.outcomeNodeKey);
	if (!outcome || outcome.nodeKey.type !== "Outcome") {
		return {
			complete: false,
			fillIds: [],
			incompleteReasons: [GRAPH_T12_INCOMPLETE_REASONS.OUTCOME_NOT_FOUND],
		};
	}

	const fillIds = new Set<string>();
	const attributions = await graphStore.listNeighbors({
		startNodeKey: input.outcomeNodeKey,
		edgeTypes: [T12_EDGES.ATTRIBUTES_OUTCOME],
		direction: "IN",
		maxResults: 256,
	});
	for (const edge of attributions) {
		if (edge.targetNodeKey.type !== "PerformanceAttribution") {
			continue;
		}
		const contributions = await graphStore.listNeighbors({
			startNodeKey: edge.targetNodeKey,
			edgeTypes: [T12_EDGES.CONTRIBUTION_FROM],
			direction: "IN",
			maxResults: 256,
		});
		for (const contribution of contributions) {
			if (contribution.targetNodeKey.type === "Fill") {
				fillIds.add(contribution.targetNodeKey.id);
			}
		}
	}

	return {
		complete: true,
		fillIds: [...fillIds],
	};
}
