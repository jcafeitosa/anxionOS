import type {
	InferenceInvokeInput,
	InferenceInvokeResult,
} from "../../domain/ports/inference-port";

export async function invokeSimulatedInference(
	input: InferenceInvokeInput,
): Promise<InferenceInvokeResult> {
	const typedInput =
		input.typedInput && typeof input.typedInput === "object"
			? (input.typedInput as Record<string, unknown>)
			: {};
	if (typedInput.awaitHumanApproval === true) {
		const operationId =
			typeof typedInput.operationId === "string"
				? typedInput.operationId
				: `sim-wait-${input.operation}`;
		return {
			disposition: "waiting_human",
			operationId,
			modelRef: "simulated/model-v1",
			reason:
				typeof typedInput.reason === "string"
					? typedInput.reason
					: "Human approval required (SIMULATED)",
		};
	}
	const started = Date.now();
	return {
		disposition: "completed",
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
