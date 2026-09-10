import {
	type SimulationCommandResult,
	type SimulationErrorCode,
	simulationCommandResultSchema,
} from "@anxionos/contracts/simulation";

export class SimulationCommandError extends Error {
	readonly code: SimulationErrorCode;

	constructor(code: SimulationErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "SimulationCommandError";
	}
}

export function throwSimulationError(
	code: SimulationErrorCode,
	message: string,
): never {
	throw new SimulationCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): SimulationCommandResult {
	return simulationCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		simulationRunId: snapshot.simulationRunId,
	});
}
