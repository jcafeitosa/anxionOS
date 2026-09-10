import type { T15Input, T15Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import {
	collectNeighborIds,
	guardTemporal,
	requireAnchorNode,
} from "./traversal-common";

const T15_EDGES = {
	SELECTS_MODEL: "SELECTS_MODEL",
	PERMITS_OFFERING: "PERMITS_OFFERING",
} as const;

export async function evaluateT15ConnectionsListModels(
	graphStore: GraphStore,
	input: T15Input,
	knownAt?: string,
): Promise<T15Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			eligibleOfferingIds: [],
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(
		graphStore,
		input.bindingNodeKey,
		"AgentModelBinding",
	);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			eligibleOfferingIds: [],
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const directOfferings = await collectNeighborIds(
		graphStore,
		input.bindingNodeKey,
		[T15_EDGES.SELECTS_MODEL],
		"OUT",
		"ModelOffering",
	);

	const eligibleOfferingIds = new Set(directOfferings);
	const grants = await graphStore.listNeighbors({
		startNodeKey: input.bindingNodeKey,
		edgeTypes: ["HAS_MODEL_BINDING"],
		direction: "IN",
		maxResults: 64,
	});
	for (const grantEdge of grants) {
		if (grantEdge.targetNodeKey.type !== "OfferingAccessGrant") {
			continue;
		}
		const grantPayload = (await graphStore.getNode(grantEdge.targetNodeKey))
			?.payload;
		if (grantPayload?.consumerKind !== input.consumerKind) {
			continue;
		}
		const offerings = await collectNeighborIds(
			graphStore,
			grantEdge.targetNodeKey,
			[T15_EDGES.PERMITS_OFFERING],
			"OUT",
			"ModelOffering",
		);
		for (const id of offerings) {
			eligibleOfferingIds.add(id);
		}
	}

	return {
		complete: true,
		eligibleOfferingIds: [...eligibleOfferingIds],
	};
}
