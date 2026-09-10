import type { T16Input, T16Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import {
	collectNeighborIds,
	guardTemporal,
	requireAnchorNode,
} from "./traversal-common";

const T16_EDGES = {
	HAS_ROUTING_DECISION: "HAS_ROUTING_DECISION",
	HAS_INFERENCE_ATTEMPT: "HAS_INFERENCE_ATTEMPT",
} as const;

export async function evaluateT16RoutingTrace(
	graphStore: GraphStore,
	input: T16Input,
	knownAt?: string,
): Promise<T16Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			attemptIds: [],
			routingDecisionIds: [],
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(
		graphStore,
		input.inferenceRequestNodeKey,
		"InferenceRequest",
	);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			attemptIds: [],
			routingDecisionIds: [],
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const routingDecisionIds = await collectNeighborIds(
		graphStore,
		input.inferenceRequestNodeKey,
		[T16_EDGES.HAS_ROUTING_DECISION],
		"OUT",
		"RoutingDecision",
	);

	const attemptIds = new Set<string>();
	const directAttempts = await collectNeighborIds(
		graphStore,
		input.inferenceRequestNodeKey,
		[T16_EDGES.HAS_INFERENCE_ATTEMPT],
		"OUT",
		"InferenceAttempt",
	);
	for (const id of directAttempts) {
		attemptIds.add(id);
	}
	for (const decisionId of routingDecisionIds) {
		const decisionKey = {
			...input.inferenceRequestNodeKey,
			type: "RoutingDecision",
			id: decisionId,
		};
		const attempts = await collectNeighborIds(
			graphStore,
			decisionKey,
			[T16_EDGES.HAS_INFERENCE_ATTEMPT],
			"OUT",
			"InferenceAttempt",
		);
		for (const id of attempts) {
			attemptIds.add(id);
		}
	}

	return {
		complete: true,
		attemptIds: [...attemptIds],
		routingDecisionIds,
	};
}
