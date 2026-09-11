import {
	listSimulationRunsQuerySchema,
	simulationRunIdSchema,
} from "@anxionos/contracts/simulation";
import {
	getSimulationRun,
	getSimulationRunSnapshot,
	listSimulationRuns,
} from "@anxionos/simulation";
import { z } from "zod";
import type { SimulationPluginDeps } from "../plugin";

export const simulationRunIdParamSchema = z.object({
	simulationRunId: simulationRunIdSchema,
});

export async function handleListSimulationRuns(
	deps: SimulationPluginDeps,
	input: { agencyId: string; query: Record<string, string | undefined> },
) {
	const filter = listSimulationRunsQuerySchema.parse(input.query);
	return listSimulationRuns({ runs: deps.runs }, input.agencyId, filter);
}

export async function handleGetSimulationRun(
	deps: SimulationPluginDeps,
	input: { agencyId: string; simulationRunId: string },
) {
	return getSimulationRun(
		{ runs: deps.runs },
		input.agencyId,
		input.simulationRunId,
	);
}

export async function handleGetSimulationRunSnapshot(
	deps: SimulationPluginDeps,
	input: { agencyId: string; simulationRunId: string },
) {
	return getSimulationRunSnapshot(
		{ runs: deps.runs, snapshots: deps.snapshots },
		input.agencyId,
		input.simulationRunId,
	);
}
