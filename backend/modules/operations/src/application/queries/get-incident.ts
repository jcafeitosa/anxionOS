import type { IncidentSnapshot } from "@anxionos/contracts/operations";
import type { IncidentRepository } from "../../domain/ports/operations-unit-of-work";
import { throwOperationsError } from "../errors";
import { toIncidentSnapshot } from "./incident-query-support";

export interface GetIncidentDeps {
	incidents: IncidentRepository;
}

export async function getIncident(
	deps: GetIncidentDeps,
	organizationId: string,
	incidentId: string,
): Promise<IncidentSnapshot> {
	const record = await deps.incidents.findByOrganizationAndId(
		organizationId,
		incidentId,
	);
	if (!record) {
		throwOperationsError("OPS_INCIDENT_NOT_FOUND", "incident not found");
	}
	return toIncidentSnapshot(record);
}
