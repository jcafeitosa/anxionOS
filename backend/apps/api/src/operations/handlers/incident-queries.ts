import { getIncident, listIncidents } from "@anxionos/operations";
import type { OperationsPluginDeps } from "../plugin";

export async function handleGetIncident(
	deps: OperationsPluginDeps,
	input: { agencyId: string; incidentId: string },
) {
	return getIncident(
		{
			incidents: deps.incidents,
		},
		input.agencyId,
		input.incidentId,
	);
}

export async function handleListIncidents(
	deps: OperationsPluginDeps,
	input: { agencyId: string },
) {
	return listIncidents(
		{
			incidents: deps.incidents,
		},
		input.agencyId,
	);
}
