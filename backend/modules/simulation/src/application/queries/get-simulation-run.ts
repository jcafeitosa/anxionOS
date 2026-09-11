import type { SimulationRun } from "@anxionos/contracts/simulation";
import type { SimulationRunRepository } from "../../domain/ports/simulation-unit-of-work";
import { throwSimulationError } from "../errors";
import { toSimulationRun } from "./query-support";

export interface GetSimulationRunDeps {
	runs: SimulationRunRepository;
}

export async function getSimulationRun(
	deps: GetSimulationRunDeps,
	organizationId: string,
	simulationRunId: string,
): Promise<SimulationRun> {
	const record = await deps.runs.findByOrganizationAndId(
		organizationId,
		simulationRunId,
	);
	if (!record) {
		throwSimulationError(
			"SIM_RUN_NOT_FOUND",
			`simulation run ${simulationRunId} not found`,
		);
	}
	return toSimulationRun(record);
}
