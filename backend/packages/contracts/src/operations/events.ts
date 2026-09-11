import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	operationsDeletionRequestIdSchema,
	operationsExportJobIdSchema,
	operationsHealthCheckIdSchema,
	operationsHealthStatusSchema,
	operationsIncidentIdSchema,
	operationsIncidentSeveritySchema,
	operationsIncidentStatusSchema,
	operationsRecoveryStepKindSchema,
	operationsRecoveryTaskIdSchema,
	operationsRecoveryTaskStatusSchema,
	operationsRetentionActionSchema,
	operationsRetentionPolicyIdSchema,
	operationsRetentionScopeSchema,
	operationsRunbookIdSchema,
} from "./types";
export const OPERATIONS_EVENT_TYPES = {
	INCIDENT_OPENED: "operations.incident.opened.v1",
	INCIDENT_STATUS_CHANGED: "operations.incident.status.changed.v1",
	INCIDENT_RUNBOOK_ATTACHED: "operations.incident.runbook.attached.v1",
	HEALTH_DEGRADED: "operations.health.degraded.v1",
	RECOVERY_TASK_STARTED: "operations.recovery.task.started.v1",
	RECOVERY_TASK_APPROVED: "operations.recovery.task.approved.v1",
	RECOVERY_TASK_EXECUTION_STARTED:
		"operations.recovery.task.execution.started.v1",
	RECOVERY_TASK_COMPLETED: "operations.recovery.task.completed.v1",
	RECOVERY_TASK_FAILED: "operations.recovery.task.failed.v1",
	RECOVERY_TASK_CANCELLED: "operations.recovery.task.cancelled.v1",
	RETENTION_POLICY_REGISTERED: "operations.retention.policy.registered.v1",
	EXPORT_JOB_REQUESTED: "operations.export.job.requested.v1",
	DELETION_REQUESTED: "operations.deletion.requested.v1",
	DELETION_APPROVED: "operations.deletion.approved.v1",
};
export const incidentOpenedPayloadSchema = z.object({
	incidentId: operationsIncidentIdSchema,
	organizationId: institutionalUuidSchema,
	title: z.string().min(1),
	description: z.string().optional(),
	severity: operationsIncidentSeveritySchema,
	serviceId: z.string().optional(),
	openedAt: z.string().datetime(),
});
export const incidentStatusChangedPayloadSchema = z.object({
	incidentId: operationsIncidentIdSchema,
	organizationId: institutionalUuidSchema,
	fromStatus: operationsIncidentStatusSchema,
	toStatus: operationsIncidentStatusSchema,
	revision: z.number().int().positive(),
	reason: z.string().optional(),
	changedAt: z.string().datetime(),
});
export const incidentRunbookAttachedPayloadSchema = z.object({
	incidentId: operationsIncidentIdSchema,
	organizationId: institutionalUuidSchema,
	runbookId: operationsRunbookIdSchema,
	runbookVersion: z.string().min(1).max(64),
	responsiblePrincipalId: institutionalUuidSchema.optional(),
	evidence: z.string().optional(),
	attachedAt: z.string().datetime(),
	revision: z.number().int().positive(),
});
export const healthDegradedPayloadSchema = z.object({
	healthCheckId: operationsHealthCheckIdSchema,
	organizationId: institutionalUuidSchema,
	serviceId: z.string().min(1),
	status: operationsHealthStatusSchema,
	checkedAt: z.string().datetime(),
});
export const recoveryTaskStartedPayloadSchema = z.object({
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	organizationId: institutionalUuidSchema,
	incidentId: operationsIncidentIdSchema,
	stepKind: operationsRecoveryStepKindSchema,
	status: operationsRecoveryTaskStatusSchema,
	stepRequiresApproval: z.boolean(),
	hasRequiredApproval: z.boolean(),
	startedAt: z.string().datetime(),
	revision: z.number().int().positive(),
	initiatedByPrincipalId: institutionalUuidSchema.optional(),
});
export const recoveryTaskApprovedPayloadSchema = z.object({
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	organizationId: institutionalUuidSchema,
	incidentId: operationsIncidentIdSchema,
	fromStatus: operationsRecoveryTaskStatusSchema,
	toStatus: z.literal("APPROVED"),
	stepKind: operationsRecoveryStepKindSchema,
	hasRequiredApproval: z.literal(true),
	revision: z.number().int().positive(),
	approvedAt: z.string().datetime(),
	approvedByPrincipalId: institutionalUuidSchema.optional(),
});
export const recoveryTaskExecutionStartedPayloadSchema = z.object({
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	organizationId: institutionalUuidSchema,
	incidentId: operationsIncidentIdSchema,
	fromStatus: operationsRecoveryTaskStatusSchema,
	toStatus: z.literal("IN_PROGRESS"),
	stepKind: operationsRecoveryStepKindSchema,
	revision: z.number().int().positive(),
	startedAt: z.string().datetime(),
});
export const recoveryTaskCompletedPayloadSchema = z.object({
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	organizationId: institutionalUuidSchema,
	incidentId: operationsIncidentIdSchema,
	fromStatus: z.literal("IN_PROGRESS"),
	toStatus: z.literal("COMPLETED"),
	stepKind: operationsRecoveryStepKindSchema,
	revision: z.number().int().positive(),
	completedAt: z.string().datetime(),
	completedByPrincipalId: institutionalUuidSchema.optional(),
});
export const recoveryTaskFailedPayloadSchema = z.object({
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	organizationId: institutionalUuidSchema,
	incidentId: operationsIncidentIdSchema,
	fromStatus: z.literal("IN_PROGRESS"),
	toStatus: z.literal("FAILED"),
	stepKind: operationsRecoveryStepKindSchema,
	revision: z.number().int().positive(),
	failedAt: z.string().datetime(),
	failureReason: z.string().max(4096).optional(),
	failedByPrincipalId: institutionalUuidSchema.optional(),
});
export const recoveryTaskCancelledPayloadSchema = z.object({
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	organizationId: institutionalUuidSchema,
	incidentId: operationsIncidentIdSchema,
	fromStatus: operationsRecoveryTaskStatusSchema,
	toStatus: z.literal("CANCELLED"),
	stepKind: operationsRecoveryStepKindSchema,
	revision: z.number().int().positive(),
	cancelledAt: z.string().datetime(),
	cancelReason: z.string().max(4096).optional(),
	cancelledByPrincipalId: institutionalUuidSchema.optional(),
});
export const operationsEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.INCIDENT_OPENED),
		payload: incidentOpenedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.INCIDENT_STATUS_CHANGED),
		payload: incidentStatusChangedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.INCIDENT_RUNBOOK_ATTACHED),
		payload: incidentRunbookAttachedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.HEALTH_DEGRADED),
		payload: healthDegradedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.RECOVERY_TASK_STARTED),
		payload: recoveryTaskStartedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.RECOVERY_TASK_APPROVED),
		payload: recoveryTaskApprovedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(
			OPERATIONS_EVENT_TYPES.RECOVERY_TASK_EXECUTION_STARTED,
		),
		payload: recoveryTaskExecutionStartedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.RECOVERY_TASK_COMPLETED),
		payload: recoveryTaskCompletedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.RECOVERY_TASK_FAILED),
		payload: recoveryTaskFailedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.RECOVERY_TASK_CANCELLED),
		payload: recoveryTaskCancelledPayloadSchema,
	}),
]);

export type OperationsEventType =
	(typeof OPERATIONS_EVENT_TYPES)[keyof typeof OPERATIONS_EVENT_TYPES];

export const retentionPolicyRegisteredPayloadSchema = z.object({
	policyId: operationsRetentionPolicyIdSchema,
	organizationId: institutionalUuidSchema,
	scope: operationsRetentionScopeSchema,
	action: operationsRetentionActionSchema,
	retentionDays: z.number().int().nonnegative(),
	legalHold: z.boolean(),
	exportManifestRequired: z.boolean(),
	createdBy: institutionalUuidSchema,
});
export const exportJobRequestedPayloadSchema = z.object({
	exportJobId: operationsExportJobIdSchema,
	organizationId: institutionalUuidSchema,
	scope: operationsRetentionScopeSchema,
	subjectId: z.string().min(1),
	requestedBy: institutionalUuidSchema,
});
export const deletionRequestedPayloadSchema = z.object({
	deletionRequestId: operationsDeletionRequestIdSchema,
	organizationId: institutionalUuidSchema,
	scope: operationsRetentionScopeSchema,
	subjectId: z.string().min(1),
	policyId: operationsRetentionPolicyIdSchema,
	requestedBy: institutionalUuidSchema,
});
export const deletionApprovedPayloadSchema = z.object({
	deletionRequestId: operationsDeletionRequestIdSchema,
	organizationId: institutionalUuidSchema,
	approvedBy: institutionalUuidSchema,
});
