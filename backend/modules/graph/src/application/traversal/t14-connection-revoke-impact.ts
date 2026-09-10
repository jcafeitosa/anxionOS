import type { T14Input, T14Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../domain/ports/graph-store";
import { evaluateT02Temporal } from "./t02-temporal-evaluation";

export const GRAPH_T14_INCOMPLETE_REASONS = {
	CONNECTION_NOT_FOUND: "GRAPH_T14_CONNECTION_NOT_FOUND",
	INVALID_TEMPORAL_CONTEXT: "GRAPH_T14_INVALID_TEMPORAL_CONTEXT",
} as const;

const T14_EDGES = {
	SERVED_VIA: "SERVED_VIA",
	HAS_MODEL_BINDING: "HAS_MODEL_BINDING",
	HAS_ROUTING_DECISION: "HAS_ROUTING_DECISION",
} as const;

export async function evaluateT14ConnectionRevokeImpact(
	graphStore: GraphStore,
	input: T14Input,
	knownAt?: string,
): Promise<T14Output> {
	const temporal = evaluateT02Temporal({
		params: { validAt: input.validAt },
		knownAt,
	});
	if (!temporal.complete) {
		return {
			complete: false,
			impactedBindingIds: [],
			impactedInferenceRequestIds: [],
			incompleteReasons: [
				GRAPH_T14_INCOMPLETE_REASONS.INVALID_TEMPORAL_CONTEXT,
				...(temporal.reasons ?? []),
			],
		};
	}

	const connection = await graphStore.getNode(input.connectionNodeKey);
	if (!connection || connection.nodeKey.type !== "Connection") {
		return {
			complete: false,
			impactedBindingIds: [],
			impactedInferenceRequestIds: [],
			incompleteReasons: [GRAPH_T14_INCOMPLETE_REASONS.CONNECTION_NOT_FOUND],
		};
	}

	const bindingIds = new Set<string>();
	const inferenceIds = new Set<string>();

	const directBindings = await graphStore.listNeighbors({
		startNodeKey: input.connectionNodeKey,
		edgeTypes: [T14_EDGES.HAS_MODEL_BINDING],
		direction: "IN",
		maxResults: 256,
	});
	for (const edge of directBindings) {
		if (edge.targetNodeKey.type === "AgentModelBinding") {
			bindingIds.add(edge.targetNodeKey.id);
		}
	}

	const offerings = await graphStore.listNeighbors({
		startNodeKey: input.connectionNodeKey,
		edgeTypes: [T14_EDGES.SERVED_VIA],
		direction: "IN",
		maxResults: 256,
	});
	for (const offeringEdge of offerings) {
		const offeringBindings = await graphStore.listNeighbors({
			startNodeKey: offeringEdge.targetNodeKey,
			edgeTypes: [T14_EDGES.HAS_MODEL_BINDING],
			direction: "OUT",
			maxResults: 256,
		});
		for (const bindingEdge of offeringBindings) {
			if (bindingEdge.targetNodeKey.type === "AgentModelBinding") {
				bindingIds.add(bindingEdge.targetNodeKey.id);
			}
		}
	}

	for (const bindingId of bindingIds) {
		const bindingKey = {
			...input.connectionNodeKey,
			type: "AgentModelBinding",
			id: bindingId,
		};
		const routing = await graphStore.listNeighbors({
			startNodeKey: bindingKey,
			edgeTypes: [T14_EDGES.HAS_ROUTING_DECISION],
			direction: "IN",
			maxResults: 256,
		});
		for (const route of routing) {
			if (route.targetNodeKey.type === "InferenceRequest") {
				inferenceIds.add(route.targetNodeKey.id);
			}
		}
	}

	return {
		complete: true,
		impactedBindingIds: [...bindingIds],
		impactedInferenceRequestIds: [...inferenceIds],
	};
}
