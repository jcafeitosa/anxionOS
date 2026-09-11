import { z } from "zod";
export const OPERATIONS_OWNER_DOMAIN = "operations";
export const operationsHealthCheckIdSchema = z
	.string()
	.regex(/^ops_hlt_[0-9a-f-]{36}$/i);
export const operationsIncidentIdSchema = z
	.string()
	.regex(/^ops_inc_[0-9a-f-]{36}$/i);
export const operationsRunbookIdSchema = z
	.string()
	.regex(/^ops_rnb_[0-9a-f-]{36}$/i);
export const operationsRecoveryTaskIdSchema = z
	.string()
	.regex(/^ops_rcv_[0-9a-f-]{36}$/i);
export const operationsHealthStatusSchema = z.enum([
	"HEALTHY",
	"DEGRADED",
	"UNHEALTHY",
]);
export const operationsIncidentSeveritySchema = z.enum([
	"LOW",
	"MEDIUM",
	"HIGH",
	"CRITICAL",
]);
export const operationsIncidentStatusSchema = z.enum([
	"OPEN",
	"ACKNOWLEDGED",
	"INVESTIGATING",
	"MITIGATING",
	"ESCALATED",
	"RESOLVED",
	"CLOSED",
]);
export const operationsRecoveryTaskStatusSchema = z.enum([
	"PENDING",
	"AWAITING_APPROVAL",
	"APPROVED",
	"IN_PROGRESS",
	"COMPLETED",
	"FAILED",
	"CANCELLED",
]);
/** Deterministic recovery steps only — LLM/inference steps are rejected at domain boundary. */
export const operationsRecoveryStepKindSchema = z.enum([
	"VALIDATE_SCHEMA",
	"CHECK_CHECKPOINT",
	"VERIFY_INTEGRITY",
	"RESTORE_DATABASE",
	"REPLAY_OUTBOX",
	"REBUILD_PROJECTION",
	"PURGE_QUEUE",
]);

export type OperationsHealthCheckId = z.infer<
	typeof operationsHealthCheckIdSchema
>;
export type OperationsIncidentId = z.infer<typeof operationsIncidentIdSchema>;

/** ANX-313 S3 — retention/export/deletion */
export const operationsRetentionPolicyIdSchema = z
	.string()
	.regex(/^ops_rpo_[0-9a-f-]{36}$/i);
export const operationsExportJobIdSchema = z
	.string()
	.regex(/^ops_exp_[0-9a-f-]{36}$/i);
export const operationsDeletionRequestIdSchema = z
	.string()
	.regex(/^ops_del_[0-9a-f-]{36}$/i);
export const operationsRetentionScopeSchema = z.enum([
	"INCIDENT",
	"HEALTH_CHECK",
	"RECOVERY_TASK",
	"EXPORT_MANIFEST",
]);
export const operationsRetentionActionSchema = z.enum([
	"PURGE",
	"EXPORT_THEN_PURGE",
]);
export const operationsExportJobStatusSchema = z.enum([
	"REQUESTED",
	"RUNNING",
	"COMPLETED",
	"FAILED",
]);
export const operationsDeletionRequestStatusSchema = z.enum([
	"REQUESTED",
	"APPROVED",
	"REJECTED",
	"EXECUTED",
]);

export type OperationsRetentionPolicyId = z.infer<
	typeof operationsRetentionPolicyIdSchema
>;
export type OperationsExportJobId = z.infer<
	typeof operationsExportJobIdSchema
>;
export type OperationsDeletionRequestId = z.infer<
	typeof operationsDeletionRequestIdSchema
>;
export type OperationsRetentionScope = z.infer<
	typeof operationsRetentionScopeSchema
>;
export type OperationsRetentionAction = z.infer<
	typeof operationsRetentionActionSchema
>;
export type OperationsExportJobStatus = z.infer<
	typeof operationsExportJobStatusSchema
>;
export type OperationsDeletionRequestStatus = z.infer<
	typeof operationsDeletionRequestStatusSchema
>;

export type OperationsRunbookId = z.infer<typeof operationsRunbookIdSchema>;
export type OperationsRecoveryTaskId = z.infer<
	typeof operationsRecoveryTaskIdSchema
>;
export type OperationsHealthStatus = z.infer<
	typeof operationsHealthStatusSchema
>;
export type OperationsIncidentSeverity = z.infer<
	typeof operationsIncidentSeveritySchema
>;
export type OperationsIncidentStatus = z.infer<
	typeof operationsIncidentStatusSchema
>;
export type OperationsRecoveryTaskStatus = z.infer<
	typeof operationsRecoveryTaskStatusSchema
>;
export type OperationsRecoveryStepKind = z.infer<
	typeof operationsRecoveryStepKindSchema
>;
