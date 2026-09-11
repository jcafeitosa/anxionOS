import type { SimulationCommandResult } from "@anxionos/contracts/simulation";
import { runStartedPayloadSchema } from "@anxionos/contracts/simulation";
import {
	executeSimulationRun,
	type ExecuteSimulationRunDeps,
} from "../commands/execute-simulation-run";

export interface RunStartedConsumerDeps extends ExecuteSimulationRunDeps {}

export function createRunStartedConsumer(deps: RunStartedConsumerDeps): {
	handle(
		payload: unknown,
		eventId: string,
	): Promise<SimulationCommandResult>;
} {
	return {
		async handle(payload, eventId) {
			const parsed = runStartedPayloadSchema.parse(payload);
			return executeSimulationRun(deps, {
				commandId: eventId,
				organizationId: parsed.organizationId,
				simulationRunId: parsed.simulationRunId,
			});
		},
	};
}
