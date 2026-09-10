export interface InferenceInvokeInput {
	operation: string;
	typedInput: unknown;
}

export interface InferenceInvokeCompleted {
	disposition: "completed";
	modelRef: string;
	output: unknown;
	latencyMs: number;
	quantity: number;
	unit: string;
}

export interface InferenceInvokeWaitingHuman {
	disposition: "waiting_human";
	operationId: string;
	modelRef?: string;
	reason?: string;
}

export type InferenceInvokeResult =
	| InferenceInvokeCompleted
	| InferenceInvokeWaitingHuman;

/** Port for provider inference adapters (SIMULATED slice). */
export interface InferencePort {
	invoke(input: InferenceInvokeInput): Promise<InferenceInvokeResult>;
}
