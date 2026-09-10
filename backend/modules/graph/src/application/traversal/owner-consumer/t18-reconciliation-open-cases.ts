import type { T18Input, T18Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import { guardTemporal, requireAnchorNode } from "./traversal-common";

const T18_EDGES = {
	RECONCILES_RESOURCE: "RECONCILES_RESOURCE",
	POSTS_LEDGER: "POSTS_LEDGER",
} as const;

export async function evaluateT18ReconciliationOpenCases(
	graphStore: GraphStore,
	input: T18Input,
	knownAt?: string,
): Promise<T18Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			caseIds: [],
			differenceUsd: null,
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(
		graphStore,
		input.resourceNodeKey,
		input.resourceNodeKey.type,
	);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			caseIds: [],
			differenceUsd: null,
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const caseIds: string[] = [];
	let differenceUsd = 0;

	const cases = await graphStore.listNeighbors({
		startNodeKey: input.resourceNodeKey,
		edgeTypes: [T18_EDGES.RECONCILES_RESOURCE],
		direction: "IN",
		maxResults: 128,
	});
	for (const caseEdge of cases) {
		if (caseEdge.targetNodeKey.type !== "ReconciliationCase") {
			continue;
		}
		const caseNode = await graphStore.getNode(caseEdge.targetNodeKey);
		if (!caseNode) {
			continue;
		}
		const status = String(caseNode.payload.status ?? "OPEN");
		if (input.status === "OPEN" && status !== "OPEN") {
			continue;
		}
		if (input.status === "RESOLVED" && status !== "RESOLVED") {
			continue;
		}
		caseIds.push(caseEdge.targetNodeKey.id);
		const diff = Number(caseNode.payload.differenceUsd ?? 0);
		if (!Number.isNaN(diff)) {
			differenceUsd += diff;
		}
	}

	return {
		complete: true,
		caseIds,
		differenceUsd: caseIds.length > 0 ? differenceUsd : null,
	};
}
