import {
	getRecoveryTask,
	listRecoveryTasksByIncident,
} from "@anxionos/operations";
import type { OperationsPluginDeps } from "../plugin";

export async function handleGetRecoveryTask(
	deps: OperationsPluginDeps,
	input: { agencyId: string; recoveryTaskId: string },
) {
	return getRecoveryTask(
		{ recoveryTasks: deps.recoveryTasks },
		input.agencyId,
		input.recoveryTaskId,
	);
}

export async function handleListRecoveryTasksByIncident(
	deps: OperationsPluginDeps,
	input: { agencyId: string; incidentId: string },
) {
	return listRecoveryTasksByIncident(
		{
			incidents: deps.incidents,
			recoveryTasks: deps.recoveryTasks,
		},
		input.agencyId,
		input.incidentId,
	);
}
