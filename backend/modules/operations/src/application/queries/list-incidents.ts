import type { ListIncidentsResponse } from "@anxionos/contracts/operations";
import { listIncidentsResponseSchema } from "@anxionos/contracts/operations";
import type { IncidentRepository } from "../../domain/ports/operations-unit-of-work";
import { toIncidentSnapshot } from "./incident-query-support";

export interface ListIncidentsDeps {
	incidents: IncidentRepository;
}

export async function listIncidents(
	deps: ListIncidentsDeps,
	organizationId: string,
): Promise<ListIncidentsResponse> {
	const records = await deps.incidents.listByOrganizationId(organizationId);
	return listIncidentsResponseSchema.parse({
		incidents: records.map(toIncidentSnapshot),
	});
}
