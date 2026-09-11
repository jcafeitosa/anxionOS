import type { ListRecoveryTasksByIncidentResponse } from "@anxionos/contracts/operations";
import {
	listRecoveryTasksByIncidentResponseSchema,
	recoveryTaskSnapshotSchema,
} from "@anxionos/contracts/operations";
import type {
	IncidentRepository,
	RecoveryTaskRepository,
} from "../../domain/ports/operations-unit-of-work";
import { throwOperationsError } from "../errors";

export interface ListRecoveryTasksByIncidentDeps {
	incidents: IncidentRepository;
	recoveryTasks: RecoveryTaskRepository;
}

export async function listRecoveryTasksByIncident(
	deps: ListRecoveryTasksByIncidentDeps,
	organizationId: string,
	incidentId: string,
): Promise<ListRecoveryTasksByIncidentResponse> {
	const incident = await deps.incidents.findById(incidentId);
	if (!incident) {
		throwOperationsError("OPS_INCIDENT_NOT_FOUND", "incident not found");
	}
	if (incident.organizationId !== organizationId) {
		throwOperationsError(
			"OPS_CROSS_TENANT",
			"incident organization mismatch",
		);
	}

	const records = await deps.recoveryTasks.listByOrganizationAndIncidentId(
		organizationId,
		incidentId,
	);

	return listRecoveryTasksByIncidentResponseSchema.parse({
		recoveryTasks: records.map((record) =>
			recoveryTaskSnapshotSchema.parse({
				recoveryTaskId: record.id,
				organizationId: record.organizationId,
				incidentId: record.incidentId,
				stepKind: record.stepKind,
				status: record.status,
				stepRequiresApproval: record.stepRequiresApproval,
				hasRequiredApproval: record.hasRequiredApproval,
				startedAt: record.startedAt,
				revision: record.revision,
				initiatedByPrincipalId: record.initiatedByPrincipalId,
			}),
		),
	});
}
