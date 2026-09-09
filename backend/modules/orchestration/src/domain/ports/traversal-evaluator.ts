export interface TraversalEvaluationInput {
    principalId: string;
    organizationId: string;
    agentId: string;
    intentHash?: string;
    actingScope: string;
}
export type TraversalDecision = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
export interface TraversalEvaluator {
    evaluateT01(input: TraversalEvaluationInput): Promise<{
        decision: TraversalDecision;
    }>;
}
