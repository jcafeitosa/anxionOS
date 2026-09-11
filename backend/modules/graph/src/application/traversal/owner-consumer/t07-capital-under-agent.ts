import type { T07Input, T07Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import {
	collectNeighborIds,
	guardTemporal,
	requireAnchorNode,
} from "./traversal-common";

const T07_EDGES = {
	MANAGED_BY: "MANAGED_BY",
	FROM_CAPITAL_ACCOUNT: "FROM_CAPITAL_ACCOUNT",
} as const;

export async function evaluateT07CapitalUnderAgent(
	graphStore: GraphStore,
	input: T07Input,
	knownAt?: string,
): Promise<T07Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			portfolioIds: [],
			accountIds: [],
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(
		graphStore,
		input.agentNodeKey,
		"Agent",
	);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			portfolioIds: [],
			accountIds: [],
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const portfolioIds = await collectNeighborIds(
		graphStore,
		input.agentNodeKey,
		[T07_EDGES.MANAGED_BY],
		"IN",
		"Portfolio",
	);

	const accountIds = new Set<string>();
	for (const portfolioId of portfolioIds) {
		const portfolioKey = {
			...input.agentNodeKey,
			type: "Portfolio",
			id: portfolioId,
		};
		const accounts = await collectNeighborIds(
			graphStore,
			portfolioKey,
			[T07_EDGES.FROM_CAPITAL_ACCOUNT],
			"OUT",
			"CapitalAccount",
		);
		for (const id of accounts) {
			accountIds.add(id);
		}
	}

	return {
		complete: true,
		portfolioIds,
		accountIds: [...accountIds],
	};
}
