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
	getServiceHealth,
	type GetServiceHealthDeps,
} from "./application/queries/get-service-health";
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
export { ensureOperationsSchema } from "./infrastructure/migrate";
export { createOperationsUnitOfWork } from "./infrastructure/operations-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
