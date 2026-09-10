import type { T20Input, T20Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import {
	collectNeighborIds,
	guardTemporal,
	requireAnchorNode,
} from "./traversal-common";

const T20_EDGES = {
	ATTRIBUTED_TO: "ATTRIBUTED_TO",
	EARNED_FROM: "EARNED_FROM",
	SETTLES_COMMISSION: "SETTLES_COMMISSION",
} as const;

export async function evaluateT20CommercialAttribution(
	graphStore: GraphStore,
	input: T20Input,
	knownAt?: string,
): Promise<T20Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			commissionIds: [],
			invoiceIds: [],
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(
		graphStore,
		input.referralNodeKey,
		"Referral",
	);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			commissionIds: [],
			invoiceIds: [],
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const commissionIds = await collectNeighborIds(
		graphStore,
		input.referralNodeKey,
		[T20_EDGES.ATTRIBUTED_TO],
		"IN",
		"Commission",
	);

	const invoiceIds = new Set<string>();
	for (const commissionId of commissionIds) {
		const commissionKey = {
			...input.referralNodeKey,
			type: "Commission",
			id: commissionId,
		};
		const invoices = await collectNeighborIds(
			graphStore,
			commissionKey,
			[T20_EDGES.EARNED_FROM, T20_EDGES.SETTLES_COMMISSION],
			"OUT",
			"Invoice",
		);
		for (const id of invoices) {
			invoiceIds.add(id);
		}
	}

	return {
		complete: true,
		commissionIds,
		invoiceIds: [...invoiceIds],
	};
}
