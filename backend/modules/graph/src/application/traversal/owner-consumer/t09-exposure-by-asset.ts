import type { T09Input, T09Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import { guardTemporal, requireAnchorNode } from "./traversal-common";

const T09_EDGES = {
	ON_INSTRUMENT: "ON_INSTRUMENT",
	REPRESENTS_ASSET: "REPRESENTS_ASSET",
} as const;

export async function evaluateT09ExposureByAsset(
	graphStore: GraphStore,
	input: T09Input,
	knownAt?: string,
): Promise<T09Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			grossExposure: null,
			netExposure: null,
			unvalued: true,
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(
		graphStore,
		input.scopeNodeKey,
		"Portfolio",
	);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			grossExposure: null,
			netExposure: null,
			unvalued: true,
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	let grossExposure = 0;
	let netExposure = 0;
	let unvalued = false;
	let matched = false;

	const positions = await graphStore.listNeighbors({
		startNodeKey: input.scopeNodeKey,
		edgeTypes: ["HAS_POSITION"],
		direction: "OUT",
		maxResults: 256,
	});

	for (const posEdge of positions) {
		if (posEdge.targetNodeKey.type !== "Position") {
			continue;
		}
		const position = await graphStore.getNode(posEdge.targetNodeKey);
		if (!position) {
			unvalued = true;
			continue;
		}

		const instruments = await graphStore.listNeighbors({
			startNodeKey: posEdge.targetNodeKey,
			edgeTypes: [T09_EDGES.ON_INSTRUMENT],
			direction: "OUT",
			maxResults: 8,
		});
		for (const instEdge of instruments) {
			const assets = await graphStore.listNeighbors({
				startNodeKey: instEdge.targetNodeKey,
				edgeTypes: [T09_EDGES.REPRESENTS_ASSET],
				direction: "OUT",
				maxResults: 8,
			});
			for (const assetEdge of assets) {
				if (assetEdge.targetNodeKey.id !== input.assetId) {
					continue;
				}
				matched = true;
				const qty = Number(position.payload.quantity ?? 0);
				const price = Number(position.payload.markPrice ?? NaN);
				if (Number.isNaN(price)) {
					unvalued = true;
					continue;
				}
				const exposure = qty * price;
				grossExposure += Math.abs(exposure);
				netExposure += exposure;
			}
		}
	}

	if (!matched) {
		return {
			complete: true,
			grossExposure: 0,
			netExposure: 0,
			unvalued: false,
		};
	}

	return {
		complete: true,
		grossExposure,
		netExposure,
		unvalued,
	};
}
