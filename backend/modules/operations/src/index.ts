export {
	registerHealthCheck,
	type RegisterHealthCheckDeps,
} from "./application/commands/register-health-check";
export {
	executeServiceHealthProbe,
	type ExecuteServiceHealthProbeDeps,
} from "./application/commands/execute-service-health-probe";
export {
	createIncident,
	type CreateIncidentDeps,
} from "./application/commands/create-incident";
export {
	transitionIncidentStatus,
	type TransitionIncidentStatusDeps,
} from "./application/commands/transition-incident-status";
export {
	attachIncidentRunbook,
	type AttachIncidentRunbookDeps,
} from "./application/commands/attach-incident-runbook";
export {
	startRecoveryTask,
	type StartRecoveryTaskDeps,
} from "./application/commands/start-recovery-task";
export {
	approveRecoveryTask,
	type ApproveRecoveryTaskDeps,
} from "./application/commands/approve-recovery-task";
export {
	startRecoveryTaskExecution,
	type StartRecoveryTaskExecutionDeps,
} from "./application/commands/start-recovery-task-execution";
export {
	completeRecoveryTask,
	type CompleteRecoveryTaskDeps,
} from "./application/commands/complete-recovery-task";
export {
	failRecoveryTask,
	type FailRecoveryTaskDeps,
} from "./application/commands/fail-recovery-task";
export {
	cancelRecoveryTask,
	type CancelRecoveryTaskDeps,
} from "./application/commands/cancel-recovery-task";
export {
	getServiceHealth,
	type GetServiceHealthDeps,
} from "./application/queries/get-service-health";
export {
	getIncident,
	type GetIncidentDeps,
} from "./application/queries/get-incident";
export {
	listIncidents,
	type ListIncidentsDeps,
} from "./application/queries/list-incidents";
export {
	getRecoveryTask,
	type GetRecoveryTaskDeps,
} from "./application/queries/get-recovery-task";
export {
	listRecoveryTasksByIncident,
	type ListRecoveryTasksByIncidentDeps,
} from "./application/queries/list-recovery-tasks-by-incident";
export {
	OperationsCommandError,
	throwOperationsError,
} from "./application/errors";
export {
	canTransitionIncidentStatus,
	isTerminalIncidentStatus,
	requiresRunbookForStatus,
} from "./domain/incident-lifecycle";
export {
	deriveHealthStatusFromProbeOutcome,
	isCheckedAtMonotonic,
	isHealthCheckStale,
	runHealthProbeWithTimeout,
} from "./domain/health-lifecycle";
export { isEligibleForPurge } from "./domain/incident-retention-policy";
export {
	canTransitionRecoveryTaskStatus,
	isTerminalRecoveryTaskStatus,
	requiresApprovalForRecoveryStep,
	isAllowedRecoveryStepKind,
	resolveInitialRecoveryTaskStatus,
} from "./domain/recovery-lifecycle";

export {
	registerRetentionPolicy,
	type RegisterRetentionPolicyDeps,
} from "./application/commands/register-retention-policy";
export {
	createExportJob,
	type CreateExportJobDeps,
} from "./application/commands/create-export-job";
export {
	requestDeletion,
	type RequestDeletionDeps,
} from "./application/commands/request-deletion";
export {
	approveDeletion,
	type ApproveDeletionDeps,
} from "./application/commands/approve-deletion";

export { ensureOperationsSchema } from "./infrastructure/migrate";
export { createOperationsDb } from "./infrastructure/create-db";
export { createOperationsUnitOfWork } from "./infrastructure/operations-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
