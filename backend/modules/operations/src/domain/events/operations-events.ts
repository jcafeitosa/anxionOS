import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	OPERATIONS_EVENT_TYPES,
	OPERATIONS_OWNER_DOMAIN,
} from "@anxionos/contracts/operations";

export function createIncidentOpenedEvent(input: {
	incidentId: string;
	organizationId: string;
	title: string;
	description?: string;
	severity: string;
	serviceId?: string;
	openedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.INCIDENT_OPENED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createIncidentStatusChangedEvent(input: {
	incidentId: string;
	organizationId: string;
	fromStatus: string;
	toStatus: string;
	revision: number;
	reason?: string;
	changedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.INCIDENT_STATUS_CHANGED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createIncidentRunbookAttachedEvent(input: {
	incidentId: string;
	organizationId: string;
	runbookId: string;
	runbookVersion: string;
	responsiblePrincipalId?: string;
	evidence?: string;
	attachedAt: string;
	revision: number;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.INCIDENT_RUNBOOK_ATTACHED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createHealthDegradedEvent(input: {
	healthCheckId: string;
	organizationId: string;
	serviceId: string;
	status: string;
	checkedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.HEALTH_DEGRADED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function isDegradedHealthStatus(status: string): boolean {
	return status === "DEGRADED" || status === "UNHEALTHY";
}

export function createRecoveryTaskStartedEvent(input: {
	recoveryTaskId: string;
	organizationId: string;
	incidentId: string;
	stepKind: string;
	status: string;
	stepRequiresApproval: boolean;
	hasRequiredApproval: boolean;
	startedAt: string;
	revision: number;
	initiatedByPrincipalId?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.RECOVERY_TASK_STARTED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createRecoveryTaskApprovedEvent(input: {
	recoveryTaskId: string;
	organizationId: string;
	incidentId: string;
	fromStatus: string;
	toStatus: "APPROVED";
	stepKind: string;
	hasRequiredApproval: true;
	revision: number;
	approvedAt: string;
	approvedByPrincipalId?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.RECOVERY_TASK_APPROVED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createRecoveryTaskExecutionStartedEvent(input: {
	recoveryTaskId: string;
	organizationId: string;
	incidentId: string;
	fromStatus: string;
	toStatus: "IN_PROGRESS";
	stepKind: string;
	revision: number;
	startedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.RECOVERY_TASK_EXECUTION_STARTED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createRecoveryTaskCompletedEvent(input: {
	recoveryTaskId: string;
	organizationId: string;
	incidentId: string;
	fromStatus: "IN_PROGRESS";
	toStatus: "COMPLETED";
	stepKind: string;
	revision: number;
	completedAt: string;
	completedByPrincipalId?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.RECOVERY_TASK_COMPLETED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createRecoveryTaskFailedEvent(input: {
	recoveryTaskId: string;
	organizationId: string;
	incidentId: string;
	fromStatus: "IN_PROGRESS";
	toStatus: "FAILED";
	stepKind: string;
	revision: number;
	failedAt: string;
	failureReason?: string;
	failedByPrincipalId?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.RECOVERY_TASK_FAILED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createRecoveryTaskCancelledEvent(input: {
	recoveryTaskId: string;
	organizationId: string;
	incidentId: string;
	fromStatus: string;
	toStatus: "CANCELLED";
	stepKind: string;
	revision: number;
	cancelledAt: string;
	cancelReason?: string;
	cancelledByPrincipalId?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.RECOVERY_TASK_CANCELLED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createRetentionPolicyRegisteredEvent(input: {
	policyId: string;
	organizationId: string;
	scope: string;
	action: string;
	retentionDays: number;
	legalHold: boolean;
	exportManifestRequired: boolean;
	createdBy: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.RETENTION_POLICY_REGISTERED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createExportJobRequestedEvent(input: {
	exportJobId: string;
	organizationId: string;
	scope: string;
	subjectId: string;
	requestedBy: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.EXPORT_JOB_REQUESTED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createDeletionRequestedEvent(input: {
	deletionRequestId: string;
	organizationId: string;
	scope: string;
	subjectId: string;
	policyId: string;
	requestedBy: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.DELETION_REQUESTED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createDeletionApprovedEvent(input: {
	deletionRequestId: string;
	organizationId: string;
	approvedBy: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: OPERATIONS_EVENT_TYPES.DELETION_APPROVED,
		schemaVersion: "0.1.0",
		ownerDomain: OPERATIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
