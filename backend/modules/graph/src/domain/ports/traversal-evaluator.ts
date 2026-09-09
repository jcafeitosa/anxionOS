import type { ScopeContext, T01Input, T01Output, T02Input, T02Output, T03Output, T04Input, T04Output, T05Input, T05Output } from "@anxionos/contracts/graph";

export type TraversalEvaluatorId = "T01" | "T02" | "T03" | "T04" | "T05";
export type TraversalEvaluatorInput = T01Input | T02Input | T04Input | T05Input;
export interface TraversalEvaluationInput {
    traversalId: TraversalEvaluatorId;
    input: TraversalEvaluatorInput;
    scope: ScopeContext;
}
export type TraversalEvaluatorOutput = T01Output | T02Output | T03Output | T04Output | T05Output;
export interface TraversalEvaluationResult {
    data: TraversalEvaluatorOutput;
    authorityEpoch: number;
    riskEpoch: number;
    projectionGeneration: number;
    checkpoint: string;
}
/** Port for governance-backed traversal evaluation (T01–T05 F0). */
export interface TraversalEvaluator {
    evaluate(input: TraversalEvaluationInput): Promise<TraversalEvaluationResult>;
}
