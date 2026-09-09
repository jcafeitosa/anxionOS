export interface InferenceInvokeInput {
	operation: string;
	typedInput: unknown;
}

export interface InferenceInvokeResult {
	modelRef: string;
	output: unknown;
	latencyMs: number;
	quantity: number;
	unit: string;
}

/** Port for provider inference adapters (SIMULATED slice). */
export interface InferencePort {
	invoke(input: InferenceInvokeInput): Promise<InferenceInvokeResult>;
}
