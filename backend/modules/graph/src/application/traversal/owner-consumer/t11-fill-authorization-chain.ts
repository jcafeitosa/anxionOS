import type { T11Input, T11Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import {
	collectNeighborIds,
	guardTemporal,
	requireAnchorNode,
} from "./traversal-common";

const T11_EDGES = {
	FILLED_AS: "FILLED_AS",
	MATERIALIZES_ORDER: "MATERIALIZES_ORDER",
	CHECKED_BY: "CHECKED_BY",
} as const;

export async function evaluateT11FillAuthorizationChain(
	graphStore: GraphStore,
	input: T11Input,
	knownAt?: string,
): Promise<T11Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			grantIds: [],
			approvalAgentIds: [],
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(graphStore, input.fillNodeKey, "Fill");
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			grantIds: [],
			approvalAgentIds: [],
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const grantIds = new Set<string>();
	const approvalAgentIds = new Set<string>();

	const orders = await graphStore.listNeighbors({
		startNodeKey: input.fillNodeKey,
		edgeTypes: [T11_EDGES.FILLED_AS],
		direction: "OUT",
		maxResults: 16,
	});
	for (const orderEdge of orders) {
		const approvals = await graphStore.listNeighbors({
			startNodeKey: orderEdge.targetNodeKey,
			edgeTypes: [T11_EDGES.CHECKED_BY],
			direction: "OUT",
			maxResults: 32,
		});
		for (const approvalEdge of approvals) {
			if (approvalEdge.targetNodeKey.type === "Approval") {
				const approval = await graphStore.getNode(approvalEdge.targetNodeKey);
				const grantId = approval?.payload.grantId;
				if (typeof grantId === "string") {
					grantIds.add(grantId);
				}
				const agentId = approval?.payload.approvalAgentId;
				if (typeof agentId === "string") {
					approvalAgentIds.add(agentId);
				}
			}
		}
	}

	return {
		complete: true,
		grantIds: [...grantIds],
		approvalAgentIds: [...approvalAgentIds],
	};
}
