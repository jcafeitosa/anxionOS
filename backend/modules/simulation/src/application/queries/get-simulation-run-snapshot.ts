import type { SimulationRunSnapshot } from "@anxionos/contracts/simulation";
import { simulationRunSnapshotSchema } from "@anxionos/contracts/simulation";
import type {
	SimulationRunRepository,
	SimulationSnapshotRepository,
} from "../../domain/ports/simulation-unit-of-work";
import { throwSimulationError } from "../errors";

export interface GetSimulationRunSnapshotDeps {
	runs: SimulationRunRepository;
	snapshots: SimulationSnapshotRepository;
}

export async function getSimulationRunSnapshot(
	deps: GetSimulationRunSnapshotDeps,
	organizationId: string,
	simulationRunId: string,
): Promise<SimulationRunSnapshot> {
	const run = await deps.runs.findByOrganizationAndId(
		organizationId,
		simulationRunId,
	);
	if (!run) {
		throwSimulationError(
			"SIM_RUN_NOT_FOUND",
			`simulation run ${simulationRunId} not found`,
		);
	}
	const snapshot = await deps.snapshots.findByOrganizationAndRunId(
		organizationId,
		simulationRunId,
	);
	if (!snapshot) {
		throwSimulationError(
			"SIM_SNAPSHOT_NOT_FOUND",
			`snapshot for simulation run ${simulationRunId} not found`,
		);
	}
	return simulationRunSnapshotSchema.parse({
		snapshotId: snapshot.id,
		simulationRunId: snapshot.simulationRunId,
		organizationId: snapshot.organizationId,
		datasetRef: snapshot.datasetRef,
		datasetHash: snapshot.datasetHash,
		snapshotPayload: snapshot.snapshotPayload,
	});
}
