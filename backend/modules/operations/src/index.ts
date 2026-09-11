export {
	type ApproveDeletionDeps,
	approveDeletion,
} from "./application/commands/approve-deletion";
export {
	type ApproveRecoveryTaskDeps,
	approveRecoveryTask,
} from "./application/commands/approve-recovery-task";
export {
	type AttachIncidentRunbookDeps,
	attachIncidentRunbook,
} from "./application/commands/attach-incident-runbook";
export {
	type CancelRecoveryTaskDeps,
	cancelRecoveryTask,
} from "./application/commands/cancel-recovery-task";
export {
	type CompleteRecoveryTaskDeps,
	completeRecoveryTask,
} from "./application/commands/complete-recovery-task";
export {
	type CreateExportJobDeps,
	createExportJob,
} from "./application/commands/create-export-job";
export {
	type CreateIncidentDeps,
	createIncident,
} from "./application/commands/create-incident";
export {
	type ExecuteServiceHealthProbeDeps,
	executeServiceHealthProbe,
} from "./application/commands/execute-service-health-probe";
export {
	type FailRecoveryTaskDeps,
	failRecoveryTask,
} from "./application/commands/fail-recovery-task";
export {
	type RegisterHealthCheckDeps,
	registerHealthCheck,
} from "./application/commands/register-health-check";
export {
	type RegisterRetentionPolicyDeps,
	registerRetentionPolicy,
} from "./application/commands/register-retention-policy";
export {
	type RequestDeletionDeps,
	requestDeletion,
} from "./application/commands/request-deletion";
export {
	type StartRecoveryTaskDeps,
	startRecoveryTask,
} from "./application/commands/start-recovery-task";
export {
	type StartRecoveryTaskExecutionDeps,
	startRecoveryTaskExecution,
} from "./application/commands/start-recovery-task-execution";
export {
	type TransitionIncidentStatusDeps,
	transitionIncidentStatus,
} from "./application/commands/transition-incident-status";
export {
	OperationsCommandError,
	throwOperationsError,
} from "./application/errors";
export {
	type LagAlertHook,
	type RecordEventingLagSliDeps,
	type RecordEventingLagSliResult,
	recordEventingLagSli,
} from "./application/instrumentation/record-eventing-lag-sli";
export {
	type GetIncidentDeps,
	getIncident,
} from "./application/queries/get-incident";
export {
	type GetPlatformSloSnapshotDeps,
	getPlatformSloSnapshot,
} from "./application/queries/get-platform-slo-snapshot";
export {
	type GetRecoveryTaskDeps,
	getRecoveryTask,
} from "./application/queries/get-recovery-task";
export {
	type GetServiceHealthDeps,
	getServiceHealth,
} from "./application/queries/get-service-health";
export {
	type ListIncidentsDeps,
	listIncidents,
} from "./application/queries/list-incidents";
export {
	type ListRecoveryTasksByIncidentDeps,
	listRecoveryTasksByIncident,
} from "./application/queries/list-recovery-tasks-by-incident";
export {
	deriveHealthStatusFromProbeOutcome,
	isCheckedAtMonotonic,
	isHealthCheckStale,
	runHealthProbeWithTimeout,
} from "./domain/health-lifecycle";
export {
	canTransitionIncidentStatus,
	isTerminalIncidentStatus,
	requiresRunbookForStatus,
} from "./domain/incident-lifecycle";
export { isEligibleForPurge } from "./domain/incident-retention-policy";
export {
	computeLagMs,
	DEFAULT_EVENTING_LAG_THRESHOLDS,
	type EventingLagAlert,
	type EventingLagSliThresholds,
	evaluateEventingLagSli,
} from "./domain/instrumentation/eventing-lag-sli";
export {
	isSensitiveMetricTagKey,
	type ParsedMetricKey,
	parseMetricKey,
	REDACTED_METRIC_VALUE,
	redactMetricTagValue,
} from "./domain/instrumentation/metrics-redaction";
export type {
	EventingLagQueryPort,
	EventingLagSample,
} from "./domain/ports/eventing-lag-query";
export {
	canTransitionRecoveryTaskStatus,
	isAllowedRecoveryStepKind,
	isTerminalRecoveryTaskStatus,
	requiresApprovalForRecoveryStep,
	resolveInitialRecoveryTaskStatus,
} from "./domain/recovery-lifecycle";
export { createPgEventingLagQueryAdapter } from "./infrastructure/adapters/pg-eventing-lag-query-adapter";
export { createOperationsDb } from "./infrastructure/create-db";
export { ensureOperationsSchema } from "./infrastructure/migrate";
export { createOperationsUnitOfWork } from "./infrastructure/operations-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
