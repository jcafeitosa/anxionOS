import type { IncidentSnapshot } from "@anxionos/contracts/operations";
import { incidentSnapshotSchema } from "@anxionos/contracts/operations";
import type { IncidentRecord } from "../../domain/ports/operations-unit-of-work";

export function toIncidentSnapshot(record: IncidentRecord): IncidentSnapshot {
	return incidentSnapshotSchema.parse({
		incidentId: record.id,
		organizationId: record.organizationId,
		title: record.title,
		description: record.description,
		severity: record.severity,
		status: record.status,
		serviceId: record.serviceId,
		openedAt: record.openedAt,
		revision: record.revision,
		runbookId: record.runbookId,
		runbookVersion: record.runbookVersion,
		runbookAttachedAt: record.runbookAttachedAt,
		responsiblePrincipalId: record.responsiblePrincipalId,
		resolvedAt: record.resolvedAt,
		closedAt: record.closedAt,
	});
}
