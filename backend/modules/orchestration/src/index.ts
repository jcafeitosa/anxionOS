export {
	getTask,
	type GetTaskDeps,
	type GetTaskInput,
} from "./application/queries/get-task";
export {
	getRun,
	type GetRunDeps,
	type GetRunInput,
} from "./application/queries/get-run";
export {
	listGateBindingsByIssue,
	type ListGateBindingsByIssueDeps,
	type ListGateBindingsByIssueInput,
	type ListGateBindingsByIssueResult,
} from "./application/queries/list-gate-bindings-by-issue";
export { assertOrganizationScopeMatch } from "./application/services/assert-orchestration-scope";
export { toGateBindingV1 } from "./application/dto-mappers";
export {
	checkoutTask,
	type CheckoutTaskDeps,
} from "./application/commands/checkout-task";
export {
	releaseTaskLease,
	type ReleaseTaskLeaseDeps,
	type ReleaseTaskLeaseResult,
} from "./application/commands/release-task-lease";
export {
	renewTaskLease,
	type RenewTaskLeaseDeps,
	type RenewTaskLeaseResult,
} from "./application/commands/renew-task-lease";
export {
	ingestTaskboardWebhook,
	type IngestTaskboardWebhookDeps,
	type IngestTaskboardWebhookResult,
} from "./application/commands/ingest-taskboard-webhook";
export {
	recordRunHeartbeat,
	type RecordRunHeartbeatDeps,
	type RecordRunHeartbeatResult,
} from "./application/commands/record-run-heartbeat";
export {
	dequeueRunHeartbeats,
	type DequeueRunHeartbeatsDeps,
	type DequeueRunHeartbeatsResult,
} from "./application/commands/dequeue-run-heartbeats";
export {
	acknowledgeRunHeartbeat,
	type AcknowledgeRunHeartbeatDeps,
	type AcknowledgeRunHeartbeatResult,
} from "./application/commands/acknowledge-run-heartbeat";
export {
	sweepExpiredLeases,
	type SweepExpiredLeasesDeps,
	type SweepExpiredLeasesResult,
} from "./application/commands/sweep-expired-leases";
export {
	recordGateDisposition,
	type RecordGateDispositionDeps,
	type RecordGateDispositionResult,
} from "./application/commands/record-gate-disposition";
export {
	requestWaitingHumanInput,
	type RequestWaitingHumanInputDeps,
} from "./application/commands/request-waiting-human-input";
export {
	cancelTaskRun,
	type CancelTaskRunDeps,
} from "./application/commands/cancel-task-run";
export {
	stopRunForBudget,
	type StopRunForBudgetDeps,
} from "./application/commands/stop-run-for-budget";
export {
	resumeFromWaitingHumanInput,
	type ResumeFromWaitingHumanInputDeps,
} from "./application/commands/resume-from-waiting-human-input";
export {
	restartRunFromCheckpoint,
	type RestartRunFromCheckpointDeps,
} from "./application/commands/restart-run-from-checkpoint";
export {
	resolveHierarchyModeForGate,
	type HierarchyModeResolverDeps,
	type HierarchyModeResolution,
} from "./application/services/hierarchy-mode-resolver";
export { createFixturePrincipalLookup }
export { createFixtureOperationalBudget } from "./infrastructure/adapters/fixture-operational-budget"; from "./infrastructure/adapters/fixture-principal-lookup";
export { createFixtureOrganizationScope } from "./infrastructure/adapters/fixture-organization-scope";
export {
	createFixtureTaskboardMirror,
	type FixtureTaskboardMirrorConfig,
} from "./infrastructure/adapters/fixture-taskboard-mirror";
export { createGovernanceTraversalAdapter } from "./infrastructure/adapters/governance-traversal-adapter";
export { createGraphQueryAdapter } from "./infrastructure/adapters/graph-query-adapter";
export {
	syncTaskboardStatus,
	type SyncTaskboardStatusDeps,
	type SyncTaskboardStatusResult,
} from "./application/commands/sync-taskboard-status";
export {
	validateMirrorTransition,
	canTransitionMirrorStatus,
	requiresG7ForMirrorStatus,
	type ValidateMirrorTransitionDeps,
	type ValidateMirrorTransitionInput,
	type TaskboardMirrorStatus,
} from "./application/services/validate-mirror-transition";
export {
	verifyTaskboardHmac,
	computeTaskboardHmac,
	resolveTaskboardHmacConfig,
	type TaskboardHmacConfig,
} from "./infrastructure/verify-taskboard-hmac";
export {
	createDashiTaskboardMirror,
	resolveDashiProjectId,
	type DashiTaskboardMirrorConfig,
} from "./infrastructure/adapters/dashi-taskboard-mirror";
export {
	TASKBOARD_POLL_INTERVAL_MS,
	T01_EVAL_TIMEOUT_MS,
} from "./domain/constants";
export {
	HEARTBEAT_QUEUE_CAP_PER_ORG,
	LEASE_SWEEPER_BATCH_SIZE,
	LEASE_SWEEPER_JITTER_MAX_MS,
} from "./domain/constants";
export { OrchestrationCommandError } from "./application/errors";
export {
	PrincipalLookupUnavailableError,
	OrganizationScopeDeniedError,
} from "./domain/ports";
export { createSystemLeaseClock } from "./infrastructure/system-lease-clock";
export { createOrchestrationDb } from "./infrastructure/create-db";
export { ensureOrchestrationSchema } from "./infrastructure/migrate";
export { createOrchestrationUnitOfWork } from "./infrastructure/orchestration-unit-of-work";
export {
	hashCommandPayload,
	toCommandResultSnapshot,
	loadIdempotentCommandSnapshot,
	assertCommandJournalReplay,
	buildCheckoutCommandId,
	buildRenewCommandId,
	buildRecordGateDispositionCommandId,
	buildRequestWaitingHumanCommandId,
	buildCancelTaskRunCommandId,
	buildStopRunForBudgetCommandId,
	buildResumeWaitingHumanCommandId,
	buildRestartRunFromCheckpointCommandId,
	toWaitingHumanResultSnapshot,
	toRestartRunFromCheckpointSnapshot,
	loadIdempotentWaitingHumanResult,
	loadIdempotentRestartRunFromCheckpointResult,
	loadIdempotentRecordGateDispositionSnapshot,
	toRecordGateDispositionSnapshot,
	CommandJournalHashMismatchError,
} from "./application/command-support";
export {
	createTaskCheckedOutEvent,
	createRunOrphanedEvent,
	createGateDispositionRecordedEvent,
	createRunWaitingHumanRequestedEvent,
	createRunResumedFromHumanEvent,
	createRunRestartedFromCheckpointEvent,
	createRunTerminatedEvent,
	createRunBudgetStoppedEvent,
} from "./domain/events/orchestration-events";
export {
	goals,
	tasks,
	runs,
	taskLeases,
	runHeartbeats,
	gateBindings,
	commandJournal,
	taskboardMirror,
} from "./infrastructure/persistence/schema";
export type {
	Goal,
	NewGoal,
	Task,
	TaskWithLease,
	NewTask,
	Run,
	NewRun,
	TaskLease,
	NewTaskLease,
	GateBinding,
	NewGateBinding,
	RunHeartbeat,
	NewRunHeartbeat,
} from "./domain/entities";
export {
	canTransitionGoalStatus,
	canTransitionCheckoutStatus,
	canTransitionRunStatus,
	isTerminalRunStatus,
	isLeaseActive,
	leaseTokensMatch,
	isGateBindingVigente,
	shouldInvalidatePriorPass,
	DEFAULT_LEASE_TTL_MS,
	MAX_LEASE_TTL_MS,
	HEARTBEAT_COALESCE_WINDOW_MS,
	buildHeartbeatCoalesceKey,
} from "./domain/entities";
export type {
	GoalRepository,
	TaskRepository,
	RunRepository,
	TaskLeaseRepository,
	GateBindingRepository,
	CommandJournalRepository,
	TaskboardMirrorRepository,
	RunHeartbeatRepository,
	OrchestrationUnitOfWork,
	OrchestrationTransactionContext,
	PrincipalLookup,
	OrganizationScopePort,
	TraversalEvaluator,
	GraphQueryPort,
	TaskboardMirrorPort,
	AgentRegistryPort,
	LeaseClock,
} from "./domain/ports";
