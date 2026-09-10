import type { TraversalEvaluatorId } from "../ports/traversal-evaluator";

/** Owner domains per traversal (matrix §6.15 / graph.md) — ANX-305. */
export const TRAVERSAL_OWNER_CONSUMER_DOMAINS: Record<
	TraversalEvaluatorId,
	readonly string[]
> = {
	T01: ["governance"],
	T02: ["governance"],
	T03: ["governance"],
	T04: ["agents"],
	T05: ["agents", "product"],
	T06: ["orchestration", "product"],
	T07: ["capital", "portfolios"],
	T08: ["strategies"],
	T09: ["portfolios", "market-data"],
	T10: ["decisions", "agents"],
	T11: ["execution", "decisions"],
	T12: ["performance"],
	T13: ["agents", "strategies", "orchestration"],
	T14: ["connections"],
	T15: ["connections", "governance"],
	T16: ["connections"],
	T17: ["connections", "billing"],
	T18: ["execution", "accounting"],
	T19: ["simulation", "governance"],
	T20: ["partners", "billing"],
};

export function resolveOwnerConsumerDomains(
	traversalId: TraversalEvaluatorId,
): readonly string[] {
	return TRAVERSAL_OWNER_CONSUMER_DOMAINS[traversalId] ?? [];
}
