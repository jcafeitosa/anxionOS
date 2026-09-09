import type { InferenceInvokeInput, InferenceInvokeResult } from "../../domain/ports/inference-port";

export async function invokeSimulatedInference(
	input: InferenceInvokeInput,
): Promise<InferenceInvokeResult> {
	const started = Date.now();
	return {
		modelRef: "simulated/model-v1",
		output: {
			operation: input.operation,
			echo: input.typedInput,
			mode: "SIMULATED",
		},
		latencyMs: Math.max(1, Date.now() - started),
		quantity: 1,
		unit: "request",
	};
}
