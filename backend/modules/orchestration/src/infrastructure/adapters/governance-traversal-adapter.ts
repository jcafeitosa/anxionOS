import type { TraversalEvaluationInput, TraversalEvaluator } from "../../domain/ports/traversal-evaluator";
import { T01_EVAL_TIMEOUT_MS } from "../../domain/constants";

export interface GovernanceTraversalAdapterConfig {
    evaluate?: (input: TraversalEvaluationInput) => Promise<{
        decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
    }>;
    timeoutMs?: number;
}

export function createGovernanceTraversalAdapter(config?: GovernanceTraversalAdapterConfig): TraversalEvaluator {
    const timeoutMs = config.timeoutMs ?? T01_EVAL_TIMEOUT_MS;
    const evaluate = config.evaluate ??
        (async () => ({ decision: "ALLOW" }));
    return {
        async evaluateT01(input) {
            return Promise.race([
                evaluate(input),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("T01 evaluation timed out")), timeoutMs);
                }),
            ]);
        },
    };
}
