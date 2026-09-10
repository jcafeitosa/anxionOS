import { T01_EVAL_TIMEOUT_MS } from "../../domain/constants";
import type {
	TraversalDecision,
	TraversalEvaluationInput,
	TraversalEvaluator,
} from "../../domain/ports/traversal-evaluator";

export interface GovernanceTraversalAdapterConfig {
	evaluate?: (input: TraversalEvaluationInput) => Promise<{
		decision: TraversalDecision;
	}>;
	timeoutMs?: number;
}

export function createGovernanceTraversalAdapter(
	config: GovernanceTraversalAdapterConfig = {},
): TraversalEvaluator {
	const timeoutMs = config.timeoutMs ?? T01_EVAL_TIMEOUT_MS;
	const evaluate =
		config.evaluate ??
		(async (): Promise<{ decision: TraversalDecision }> => ({
			decision: "ALLOW",
		}));
	return {
		async evaluateT01(input: TraversalEvaluationInput) {
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(
					() => reject(new Error("T01 evaluation timed out")),
					timeoutMs,
				);
			});
			return Promise.race([evaluate(input), timeoutPromise]);
		},
	};
}
