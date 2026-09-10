import type {
	ScopeContext,
	T01Input,
	T01Output,
	T02Input,
	T02Output,
	T03Output,
	T04Input,
	T04Output,
	T05Input,
	T05Output,
	T06Input,
	T06Output,
	T07Input,
	T07Output,
	T08Input,
	T08Output,
	T09Input,
	T09Output,
	T10Input,
	T10Output,
	T11Input,
	T11Output,
	T12Input,
	T12Output,
	T13Input,
	T13Output,
	T14Input,
	T14Output,
	T15Input,
	T15Output,
	T16Input,
	T16Output,
	T17Input,
	T17Output,
	T18Input,
	T18Output,
	T19Input,
	T19Output,
	T20Input,
	T20Output,
	TemporalContext,
} from "@anxionos/contracts/graph";

export type TraversalEvaluatorId =
	| "T01"
	| "T02"
	| "T03"
	| "T04"
	| "T05"
	| "T06"
	| "T07"
	| "T08"
	| "T09"
	| "T10"
	| "T11"
	| "T12"
	| "T13"
	| "T14"
	| "T15"
	| "T16"
	| "T17"
	| "T18"
	| "T19"
	| "T20";

export type TraversalEvaluatorInput =
	| T01Input
	| T02Input
	| T04Input
	| T05Input
	| T06Input
	| T07Input
	| T08Input
	| T09Input
	| T10Input
	| T11Input
	| T12Input
	| T13Input
	| T14Input
	| T15Input
	| T16Input
	| T17Input
	| T18Input
	| T19Input
	| T20Input;

export interface TraversalEvaluationInput {
	traversalId: TraversalEvaluatorId;
	input: TraversalEvaluatorInput;
	scope: ScopeContext;
	temporal: TemporalContext;
}

export type TraversalEvaluatorOutput =
	| T01Output
	| T02Output
	| T03Output
	| T04Output
	| T05Output
	| T06Output
	| T07Output
	| T08Output
	| T09Output
	| T10Output
	| T11Output
	| T12Output
	| T13Output
	| T14Output
	| T15Output
	| T16Output
	| T17Output
	| T18Output
	| T19Output
	| T20Output;

export interface TraversalEvaluationResult {
	data: TraversalEvaluatorOutput;
	authorityEpoch: number;
	riskEpoch: number;
	projectionGeneration: number;
	checkpoint: string;
}

/** Port for graph traversal evaluation (T01–T20). */
export interface TraversalEvaluator {
	evaluate(input: TraversalEvaluationInput): Promise<TraversalEvaluationResult>;
}
