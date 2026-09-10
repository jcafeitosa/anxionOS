import type { T17Input, T17Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import { guardTemporal, requireAnchorNode } from "./traversal-common";

const T17_EDGES = {
	GENERATED_USAGE: "GENERATED_USAGE",
} as const;

export async function evaluateT17UsageCosts(
	graphStore: GraphStore,
	input: T17Input,
	knownAt?: string,
): Promise<T17Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			totalCostUsd: null,
			usageRecordIds: [],
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(
		graphStore,
		input.scopeNodeKey,
		"Agent",
	);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			totalCostUsd: null,
			usageRecordIds: [],
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const usageRecordIds: string[] = [];
	let totalCostUsd = 0;

	const usageEdges = await graphStore.listNeighbors({
		startNodeKey: input.scopeNodeKey,
		edgeTypes: [T17_EDGES.GENERATED_USAGE],
		direction: "IN",
		maxResults: 256,
	});
	for (const edge of usageEdges) {
		if (edge.targetNodeKey.type !== "UsageRecord") {
			continue;
		}
		const record = await graphStore.getNode(edge.targetNodeKey);
		if (!record) {
			continue;
		}
		const occurredAt = String(record.payload.occurredAt ?? "");
		if (
			occurredAt < input.intervalStart ||
			occurredAt > input.intervalEnd
		) {
			continue;
		}
		usageRecordIds.push(edge.targetNodeKey.id);
		const cost = Number(record.payload.costUsd ?? 0);
		if (!Number.isNaN(cost)) {
			totalCostUsd += cost;
		}
	}

	return {
		complete: true,
		totalCostUsd,
		usageRecordIds,
	};
}
