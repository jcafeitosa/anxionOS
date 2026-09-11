import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	operationsHealthCheckIdSchema,
	operationsHealthStatusSchema,
	operationsIncidentIdSchema,
	operationsIncidentSeveritySchema,
	operationsIncidentStatusSchema,
	operationsRecoveryStepKindSchema,
	operationsRecoveryTaskIdSchema,
	operationsRunbookIdSchema,
	operationsRetentionScopeSchema,
	operationsRetentionActionSchema,
	operationsRetentionPolicyIdSchema,
	operationsDeletionRequestIdSchema,
} from "./types";
export const operationsCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	healthCheckId: operationsHealthCheckIdSchema.optional(),
	incidentId: operationsIncidentIdSchema.optional(),
	recoveryTaskId: z
		.string()
		.regex(/^ops_rcv_[0-9a-f-]{36}$/i)
		.optional(),
});
export const registerHealthCheckCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	serviceId: z.string().min(1).max(128),
	status: operationsHealthStatusSchema,
	checkedAt: z.string().datetime(),
	probeDetails: z.record(z.string(), z.unknown()).optional(),
});
export const createIncidentCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	title: z.string().min(1).max(256),
	description: z.string().max(4096).optional(),
	severity: operationsIncidentSeveritySchema,
	serviceId: z.string().min(1).max(128).optional(),
});
/** HTTP alias per R04 openIncident */
export const openIncidentCommandSchema = createIncidentCommandSchema;

/** ANX-313 S3 — retention policy registration (tenant-scoped) */
export const registerRetentionPolicyCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	scope: operationsRetentionScopeSchema,
	action: operationsRetentionActionSchema,
	retentionDays: z.number().int().nonnegative(),
	legalHold: z.boolean().default(false),
	exportManifestRequired: z.boolean().default(false),
	createdBy: institutionalUuidSchema,
});
export const createExportJobCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	scope: operationsRetentionScopeSchema,
	subjectId: z.string().min(1).max(256),
	requestedBy: institutionalUuidSchema,
});
export const requestDeletionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	scope: operationsRetentionScopeSchema,
	subjectId: z.string().min(1).max(256),
	policyId: operationsRetentionPolicyIdSchema,
	requestedBy: institutionalUuidSchema,
});
export const approveDeletionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	deletionRequestId: operationsDeletionRequestIdSchema,
	approvedBy: institutionalUuidSchema,
});
export type RegisterRetentionPolicyCommand = z.infer<
	typeof registerRetentionPolicyCommandSchema
>;
export type CreateExportJobCommand = z.infer<
	typeof createExportJobCommandSchema
>;
export type RequestDeletionCommand = z.infer<
	typeof requestDeletionCommandSchema
>;
export type ApproveDeletionCommand = z.infer<
	typeof approveDeletionCommandSchema
>;


export type OperationsCommandResult = z.infer<
	typeof operationsCommandResultSchema
>;

export type RegisterHealthCheckCommand = z.infer<
	typeof registerHealthCheckCommandSchema
>;

export type CreateIncidentCommand = z.infer<typeof createIncidentCommandSchema>;
/** HTTP alias per R04 openIncident */

export type OpenIncidentCommand = CreateIncidentCommand;

export const transitionIncidentStatusCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	incidentId: operationsIncidentIdSchema,
	expectedRevision: z.number().int().positive(),
	targetStatus: operationsIncidentStatusSchema,
	reason: z.string().max(1024).optional(),
});

export const attachIncidentRunbookCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	incidentId: operationsIncidentIdSchema,
	expectedRevision: z.number().int().positive(),
	runbookId: operationsRunbookIdSchema,
	runbookVersion: z.string().min(1).max(64),
	responsiblePrincipalId: institutionalUuidSchema.optional(),
	evidence: z.string().max(4096).optional(),
});

export type TransitionIncidentStatusCommand = z.infer<
	typeof transitionIncidentStatusCommandSchema
>;
export type AttachIncidentRunbookCommand = z.infer<
	typeof attachIncidentRunbookCommandSchema
>;

export const startRecoveryTaskCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	incidentId: operationsIncidentIdSchema,
	stepKind: z.string().min(1).max(128),
	hasRequiredApproval: z.boolean().optional(),
	initiatedByPrincipalId: institutionalUuidSchema.optional(),
});

export type StartRecoveryTaskCommand = z.infer<
	typeof startRecoveryTaskCommandSchema
>;

export const approveRecoveryTaskCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	expectedRevision: z.number().int().positive(),
	approvedByPrincipalId: institutionalUuidSchema.optional(),
});

export const startRecoveryTaskExecutionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	expectedRevision: z.number().int().positive(),
});

export type ApproveRecoveryTaskCommand = z.infer<
	typeof approveRecoveryTaskCommandSchema
>;
export type StartRecoveryTaskExecutionCommand = z.infer<
	typeof startRecoveryTaskExecutionCommandSchema
>;

export const completeRecoveryTaskCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	expectedRevision: z.number().int().positive(),
	completedByPrincipalId: institutionalUuidSchema.optional(),
});

export const failRecoveryTaskCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	expectedRevision: z.number().int().positive(),
	failureReason: z.string().max(4096).optional(),
	failedByPrincipalId: institutionalUuidSchema.optional(),
});

export const cancelRecoveryTaskCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	expectedRevision: z.number().int().positive(),
	cancelReason: z.string().max(4096).optional(),
	cancelledByPrincipalId: institutionalUuidSchema.optional(),
});

export type CompleteRecoveryTaskCommand = z.infer<
	typeof completeRecoveryTaskCommandSchema
>;
export type FailRecoveryTaskCommand = z.infer<
	typeof failRecoveryTaskCommandSchema
>;
export type CancelRecoveryTaskCommand = z.infer<
	typeof cancelRecoveryTaskCommandSchema
>;

