import type {
	ScopeContext,
	T01Input,
	T01Output,
} from "@anxionos/contracts/graph";

export interface EvaluateT01Input {
	scope: ScopeContext;
	params: T01Input;
	authorityScopeId: string;
}

export interface TraversalEvaluator {
	evaluateT01(input: EvaluateT01Input): Promise<T01Output>;
}
