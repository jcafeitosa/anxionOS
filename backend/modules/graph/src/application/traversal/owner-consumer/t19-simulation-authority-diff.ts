import type { T19Input, T19Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import {
	collectNeighborIds,
	guardTemporal,
	requireAnchorNode,
} from "./traversal-common";

const T19_EDGES = {
	USES_SNAPSHOT: "USES_SNAPSHOT",
	TESTS_CHANGE: "TESTS_CHANGE",
} as const;

export async function evaluateT19SimulationAuthorityDiff(
	graphStore: GraphStore,
	input: T19Input,
	knownAt?: string,
): Promise<T19Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			requiredApprovalIds: [],
			staleBaseline: true,
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(
		graphStore,
		input.snapshotNodeKey,
		"GraphSnapshot",
	);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			requiredApprovalIds: [],
			staleBaseline: true,
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const staleBaseline = Boolean(anchor.payload.staleBaseline);
	const requiredApprovalIds = new Set<string>();

	const proposals = await graphStore.listNeighbors({
		startNodeKey: input.snapshotNodeKey,
		edgeTypes: [T19_EDGES.USES_SNAPSHOT],
		direction: "IN",
		maxResults: 64,
	});
	for (const proposalEdge of proposals) {
		if (proposalEdge.targetNodeKey.type !== "ChangeProposal") {
			continue;
		}
		const grants = await collectNeighborIds(
			graphStore,
			proposalEdge.targetNodeKey,
			[T19_EDGES.TESTS_CHANGE],
			"OUT",
			"AuthorityGrant",
		);
		for (const id of grants) {
			requiredApprovalIds.add(id);
		}
	}

	return {
		complete: true,
		requiredApprovalIds: [...requiredApprovalIds],
		staleBaseline,
	};
}
