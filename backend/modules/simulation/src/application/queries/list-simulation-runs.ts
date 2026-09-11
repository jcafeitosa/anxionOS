import type { ListSimulationRunsResponse } from "@anxionos/contracts/simulation";
import { listSimulationRunsResponseSchema } from "@anxionos/contracts/simulation";
import type {
	ListSimulationRunsFilter,
	SimulationRunRepository,
} from "../../domain/ports/simulation-unit-of-work";
import { toSimulationRun } from "./query-support";

export interface ListSimulationRunsDeps {
	runs: SimulationRunRepository;
}

export async function listSimulationRuns(
	deps: ListSimulationRunsDeps,
	organizationId: string,
	filter?: ListSimulationRunsFilter,
): Promise<ListSimulationRunsResponse> {
	const records = await deps.runs.listByOrganizationId(
		organizationId,
		filter,
	);
	return listSimulationRunsResponseSchema.parse({
		simulationRuns: records.map(toSimulationRun),
	});
}
