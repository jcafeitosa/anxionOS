import type {
	T06Input,
	T07Input,
	T08Input,
	T09Input,
	T10Input,
	T11Input,
	T12Input,
	T13Input,
	T14Input,
	T15Input,
	T16Input,
	T17Input,
	T18Input,
	T19Input,
	T20Input,
} from "@anxionos/contracts/graph";
import {
	evaluateT06GoalDependencies,
	evaluateT07CapitalUnderAgent,
	evaluateT08StrategyDeployments,
	evaluateT09ExposureByAsset,
	evaluateT10LineageUpstream,
	evaluateT11FillAuthorizationChain,
	evaluateT13SuspendImpact,
	evaluateT15ConnectionsListModels,
	evaluateT16RoutingTrace,
	evaluateT17UsageCosts,
	evaluateT18ReconciliationOpenCases,
	evaluateT19SimulationAuthorityDiff,
	evaluateT20CommercialAttribution,
} from "../../application/traversal/owner-consumer";
import { evaluateT12OutcomeAttribution } from "../../application/traversal/t12-outcome-attribution";
import { evaluateT14ConnectionRevokeImpact } from "../../application/traversal/t14-connection-revoke-impact";
import type { GraphStore } from "../../domain/ports/graph-store";
import type {
	TraversalEvaluationInput,
	TraversalEvaluationResult,
	TraversalEvaluator,
	TraversalEvaluatorId,
} from "../../domain/ports/traversal-evaluator";

export interface KernelAwareTraversalEvaluatorDeps {
	graphStore: GraphStore;
	inner: TraversalEvaluator;
	getCheckpoint: () => Promise<string>;
	riskEpoch?: number;
}

type OwnerConsumerHandler = (
	graphStore: GraphStore,
	input: Record<string, unknown>,
	knownAt?: string,
) => Promise<Record<string, unknown>>;

const OWNER_CONSUMER_HANDLERS: Partial<
	Record<TraversalEvaluatorId, OwnerConsumerHandler>
> = {
	T06: (store, input, knownAt) =>
		evaluateT06GoalDependencies(store, input as T06Input, knownAt),
	T07: (store, input, knownAt) =>
		evaluateT07CapitalUnderAgent(store, input as T07Input, knownAt),
	T08: (store, input, knownAt) =>
		evaluateT08StrategyDeployments(store, input as T08Input, knownAt),
	T09: (store, input, knownAt) =>
		evaluateT09ExposureByAsset(store, input as T09Input, knownAt),
	T10: (store, input, knownAt) =>
		evaluateT10LineageUpstream(store, input as T10Input, knownAt),
	T11: (store, input, knownAt) =>
		evaluateT11FillAuthorizationChain(store, input as T11Input, knownAt),
	T13: (store, input, knownAt) =>
		evaluateT13SuspendImpact(store, input as T13Input, knownAt),
	T15: (store, input, knownAt) =>
		evaluateT15ConnectionsListModels(store, input as T15Input, knownAt),
	T16: (store, input, knownAt) =>
		evaluateT16RoutingTrace(store, input as T16Input, knownAt),
	T17: (store, input, knownAt) =>
		evaluateT17UsageCosts(store, input as T17Input, knownAt),
	T18: (store, input, knownAt) =>
		evaluateT18ReconciliationOpenCases(store, input as T18Input, knownAt),
	T19: (store, input, knownAt) =>
		evaluateT19SimulationAuthorityDiff(store, input as T19Input, knownAt),
	T20: (store, input, knownAt) =>
		evaluateT20CommercialAttribution(store, input as T20Input, knownAt),
};

export function createKernelAwareTraversalEvaluator(
	deps: KernelAwareTraversalEvaluatorDeps,
): TraversalEvaluator {
	const defaultRiskEpoch = deps.riskEpoch ?? 0;
	return {
		async evaluate(
			input: TraversalEvaluationInput,
		): Promise<TraversalEvaluationResult> {
			const checkpoint = await deps.getCheckpoint();
			const ownerHandler = OWNER_CONSUMER_HANDLERS[input.traversalId];
			if (ownerHandler) {
				const data = await ownerHandler(
					deps.graphStore,
					input.input as Record<string, unknown>,
					input.temporal.knownAt,
				);
				return {
					data: data as TraversalEvaluationResult["data"],
					authorityEpoch: 0,
					riskEpoch: defaultRiskEpoch,
					projectionGeneration: 0,
					checkpoint,
				};
			}
			if (input.traversalId === "T12") {
				const t12Input = input.input as T12Input;
				if (!("outcomeNodeKey" in t12Input)) {
					throw new Error("T12 requires outcomeNodeKey");
				}
				const data = await evaluateT12OutcomeAttribution(
					deps.graphStore,
					t12Input,
					input.temporal.knownAt,
				);
				return {
					data,
					authorityEpoch: 0,
					riskEpoch: defaultRiskEpoch,
					projectionGeneration: 0,
					checkpoint,
				};
			}
			if (input.traversalId === "T14") {
				const t14Input = input.input as T14Input;
				if (!("connectionNodeKey" in t14Input)) {
					throw new Error("T14 requires connectionNodeKey");
				}
				const data = await evaluateT14ConnectionRevokeImpact(
					deps.graphStore,
					t14Input,
					input.temporal.knownAt,
				);
				return {
					data,
					authorityEpoch: 0,
					riskEpoch: defaultRiskEpoch,
					projectionGeneration: 0,
					checkpoint,
				};
			}
			return deps.inner.evaluate(input);
		},
	};
}
