import type {
	ScopeContext,
	T01Input,
	T01Output,
} from "@anxionos/contracts/graph";
import type { AuthorityEpochStore } from "../../domain/ports/authority-epoch-store";
import type {
	EvaluateT01Input,
	TraversalEvaluator,
} from "../../domain/ports/traversal-evaluator";

export const GOVERNANCE_T01_TIMEOUT_MS = 2_000;
export const GOVERNANCE_T01_DENY_REASONS = {
	TIMEOUT: "GOV_T01_TIMEOUT",
	STALE_AUTHORITY_EPOCH: "GOV_AUTHORITY_EPOCH_STALE",
	GRAPH_UNAVAILABLE: "GOV_GRAPH_T01_UNAVAILABLE",
} as const;

export interface GraphKernelT01EvaluationResult {
	data: T01Output;
	authorityEpoch: number;
	riskEpoch: number;
	projectionGeneration: number;
	checkpoint: string;
}

export interface GraphKernelT01Evaluator {
	evaluate(input: {
		traversalId: "T01";
		input: T01Input;
		scope: ScopeContext;
	}): Promise<GraphKernelT01EvaluationResult>;
}

export interface CreateGraphT01TraversalEvaluatorDeps {
	authorityEpochStore: AuthorityEpochStore;
	graphEvaluator: GraphKernelT01Evaluator;
	timeoutMs?: number;
}

function denyOutput(reason: string, authorityEpoch: number): T01Output {
	return {
		decision: "DENY",
		authorityEpoch,
		denyReasons: [reason],
	};
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(GOVERNANCE_T01_DENY_REASONS.TIMEOUT));
		}, timeoutMs);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}

export function createGraphT01TraversalEvaluator(
	deps: CreateGraphT01TraversalEvaluatorDeps,
): TraversalEvaluator {
	const timeoutMs = deps.timeoutMs ?? GOVERNANCE_T01_TIMEOUT_MS;
	return {
		async evaluateT01(input: EvaluateT01Input): Promise<T01Output> {
			const localEpoch = await deps.authorityEpochStore.get(
				input.authorityScopeId,
			);
			if (
				input.params.expectedAuthorityEpoch !== undefined &&
				input.params.expectedAuthorityEpoch !== localEpoch.epoch
			) {
				return denyOutput(
					GOVERNANCE_T01_DENY_REASONS.STALE_AUTHORITY_EPOCH,
					localEpoch.epoch,
				);
			}
			const normalizedParams: T01Input = {
				...input.params,
				expectedAuthorityEpoch: localEpoch.epoch,
			};
			try {
				const result = await withTimeout(
					deps.graphEvaluator.evaluate({
						traversalId: "T01",
						input: normalizedParams,
						scope: input.scope,
					}),
					timeoutMs,
				);
				return result.data;
			} catch (error) {
				if (
					error instanceof Error &&
					error.message === GOVERNANCE_T01_DENY_REASONS.TIMEOUT
				) {
					return denyOutput(
						GOVERNANCE_T01_DENY_REASONS.TIMEOUT,
						localEpoch.epoch,
					);
				}
				return denyOutput(
					GOVERNANCE_T01_DENY_REASONS.GRAPH_UNAVAILABLE,
					localEpoch.epoch,
				);
			}
		},
	};
}
