import { shouldCacheT01Decision } from "@anxionos/contracts/graph";
import type { GraphCacheLookupInput } from "../ports/graph-read-cache";

export function shouldCacheTraversalResult(
	input: GraphCacheLookupInput,
): boolean {
	if (input.intentHash) {
		return false;
	}
	if (input.traversalId === "T01") {
		return shouldCacheT01Decision(input.decision ?? "ALLOW", input.intentHash);
	}
	return input.traversalId === "T03" || input.traversalId === "T15";
}
