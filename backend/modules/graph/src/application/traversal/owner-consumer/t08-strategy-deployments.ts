import type { T08Input, T08Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import {
	collectNeighborIds,
	guardTemporal,
	requireAnchorNode,
} from "./traversal-common";

const T08_EDGES = {
	HAS_DEPLOYMENT: "HAS_DEPLOYMENT",
	EXECUTED_BY_AGENT: "EXECUTED_BY_AGENT",
} as const;

export async function evaluateT08StrategyDeployments(
	graphStore: GraphStore,
	input: T08Input,
	knownAt?: string,
): Promise<T08Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			deploymentIds: [],
			agentIds: [],
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(
		graphStore,
		input.strategyNodeKey,
		"Strategy",
	);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			deploymentIds: [],
			agentIds: [],
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const deploymentIds = await collectNeighborIds(
		graphStore,
		input.strategyNodeKey,
		[T08_EDGES.HAS_DEPLOYMENT],
		"OUT",
		"Deployment",
	);

	const agentIds = new Set<string>();
	for (const deploymentId of deploymentIds) {
		const deploymentKey = {
			...input.strategyNodeKey,
			type: "Deployment",
			id: deploymentId,
		};
		const agents = await collectNeighborIds(
			graphStore,
			deploymentKey,
			[T08_EDGES.EXECUTED_BY_AGENT],
			"OUT",
			"Agent",
		);
		for (const id of agents) {
			agentIds.add(id);
		}
	}

	return {
		complete: true,
		deploymentIds,
		agentIds: [...agentIds],
	};
}
