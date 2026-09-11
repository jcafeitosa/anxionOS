export {
	assertCommandJournalReplay,
	buildCancelTaskRunCommandId,
	buildCheckoutCommandId,
	buildRecordGateDispositionCommandId,
	buildRenewCommandId,
	buildRequestWaitingHumanCommandId,
	buildRestartRunFromCheckpointCommandId,
	buildResumeWaitingHumanCommandId,
	buildStopRunForBudgetCommandId,
	CommandJournalHashMismatchError,
	hashCommandPayload,
	loadIdempotentCommandSnapshot,
	loadIdempotentRecordGateDispositionSnapshot,
	loadIdempotentRestartRunFromCheckpointResult,
	loadIdempotentWaitingHumanResult,
	toCommandResultSnapshot,
	toRecordGateDispositionSnapshot,
	toRestartRunFromCheckpointSnapshot,
	toWaitingHumanResultSnapshot,
} from "./application/command-support";
export {
	type AcknowledgeRunHeartbeatDeps,
	type AcknowledgeRunHeartbeatResult,
	acknowledgeRunHeartbeat,
} from "./application/commands/acknowledge-run-heartbeat";
export {
	type CancelTaskRunDeps,
	cancelTaskRun,
} from "./application/commands/cancel-task-run";
export {
	type CheckoutTaskDeps,
	checkoutTask,
} from "./application/commands/checkout-task";
export {
	type DequeueRunHeartbeatsDeps,
	type DequeueRunHeartbeatsResult,
	dequeueRunHeartbeats,
} from "./application/commands/dequeue-run-heartbeats";
export {
	type IngestTaskboardWebhookDeps,
	type IngestTaskboardWebhookResult,
	ingestTaskboardWebhook,
} from "./application/commands/ingest-taskboard-webhook";
export {
	type RecordGateDispositionDeps,
	type RecordGateDispositionResult,
	recordGateDisposition,
} from "./application/commands/record-gate-disposition";
export {
	type RecordRunHeartbeatDeps,
	type RecordRunHeartbeatResult,
	recordRunHeartbeat,
} from "./application/commands/record-run-heartbeat";
export {
	type ReleaseTaskLeaseDeps,
	type ReleaseTaskLeaseResult,
	releaseTaskLease,
} from "./application/commands/release-task-lease";
export {
	type RenewTaskLeaseDeps,
	type RenewTaskLeaseResult,
	renewTaskLease,
} from "./application/commands/renew-task-lease";
export {
	type RequestWaitingHumanInputDeps,
	requestWaitingHumanInput,
} from "./application/commands/request-waiting-human-input";
export {
	type RestartRunFromCheckpointDeps,
	restartRunFromCheckpoint,
} from "./application/commands/restart-run-from-checkpoint";
export {
	type ResumeFromWaitingHumanInputDeps,
	resumeFromWaitingHumanInput,
} from "./application/commands/resume-from-waiting-human-input";
export {
	type StopRunForBudgetDeps,
	stopRunForBudget,
} from "./application/commands/stop-run-for-budget";
export {
	type SweepExpiredLeasesDeps,
	type SweepExpiredLeasesResult,
	sweepExpiredLeases,
} from "./application/commands/sweep-expired-leases";
export {
	type SyncTaskboardStatusDeps,
	type SyncTaskboardStatusResult,
	syncTaskboardStatus,
} from "./application/commands/sync-taskboard-status";
export { toGateBindingV1 } from "./application/dto-mappers";
export { OrchestrationCommandError } from "./application/errors";
export {
	type GetRunDeps,
	type GetRunInput,
	getRun,
} from "./application/queries/get-run";
export {
	type GetTaskDeps,
	type GetTaskInput,
	getTask,
} from "./application/queries/get-task";
export {
	type ListGateBindingsByIssueDeps,
	type ListGateBindingsByIssueInput,
	type ListGateBindingsByIssueResult,
	listGateBindingsByIssue,
} from "./application/queries/list-gate-bindings-by-issue";
export { assertOrganizationScopeMatch } from "./application/services/assert-orchestration-scope";
export {
	type HierarchyModeResolution,
	type HierarchyModeResolverDeps,
	resolveHierarchyModeForGate,
} from "./application/services/hierarchy-mode-resolver";
export {
	canTransitionMirrorStatus,
	requiresG7ForMirrorStatus,
	type TaskboardMirrorStatus,
	type ValidateMirrorTransitionDeps,
	type ValidateMirrorTransitionInput,
	validateMirrorTransition,
} from "./application/services/validate-mirror-transition";
export {
	HEARTBEAT_QUEUE_CAP_PER_ORG,
	LEASE_SWEEPER_BATCH_SIZE,
	LEASE_SWEEPER_JITTER_MAX_MS,
	T01_EVAL_TIMEOUT_MS,
	TASKBOARD_POLL_INTERVAL_MS,
} from "./domain/constants";
export type {
	GateBinding,
	Goal,
	NewGateBinding,
	NewGoal,
	NewRun,
	NewRunHeartbeat,
	NewTask,
	NewTaskLease,
	Run,
	RunHeartbeat,
	Task,
	TaskLease,
	TaskWithLease,
} from "./domain/entities";
export {
	buildHeartbeatCoalesceKey,
	canTransitionCheckoutStatus,
	canTransitionGoalStatus,
	canTransitionRunStatus,
	DEFAULT_LEASE_TTL_MS,
	HEARTBEAT_COALESCE_WINDOW_MS,
	isGateBindingVigente,
	isLeaseActive,
	isTerminalRunStatus,
	leaseTokensMatch,
	MAX_LEASE_TTL_MS,
	shouldInvalidatePriorPass,
} from "./domain/entities";
export {
	createGateDispositionRecordedEvent,
	createRunBudgetStoppedEvent,
	createRunOrphanedEvent,
	createRunRestartedFromCheckpointEvent,
	createRunResumedFromHumanEvent,
	createRunTerminatedEvent,
	createRunWaitingHumanRequestedEvent,
	createTaskCheckedOutEvent,
} from "./domain/events/orchestration-events";
export type {
	AgentRegistryPort,
	CommandJournalRepository,
	GateBindingRepository,
	GoalRepository,
	GraphQueryPort,
	LeaseClock,
	OperationalBudgetPort,
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
	OrganizationScopePort,
	PrincipalLookup,
	RunHeartbeatRepository,
	RunRepository,
	TaskboardMirrorPort,
	TaskboardMirrorRepository,
	TaskLeaseRepository,
	TaskRepository,
	TraversalEvaluator,
} from "./domain/ports";
export {
	OrganizationScopeDeniedError,
	PrincipalLookupUnavailableError,
} from "./domain/ports";
export {
	createDashiTaskboardMirror,
	type DashiTaskboardMirrorConfig,
	resolveDashiProjectId,
} from "./infrastructure/adapters/dashi-taskboard-mirror";
export { createFixtureOperationalBudget } from "./infrastructure/adapters/fixture-operational-budget";
export { createFixtureOrganizationScope } from "./infrastructure/adapters/fixture-organization-scope";
export { createFixturePrincipalLookup } from "./infrastructure/adapters/fixture-principal-lookup";
export {
	createFixtureTaskboardMirror,
	type FixtureTaskboardMirrorConfig,
} from "./infrastructure/adapters/fixture-taskboard-mirror";
export { createGovernanceTraversalAdapter } from "./infrastructure/adapters/governance-traversal-adapter";
export { createGraphQueryAdapter } from "./infrastructure/adapters/graph-query-adapter";
export { createOrchestrationDb } from "./infrastructure/create-db";
export { ensureOrchestrationSchema } from "./infrastructure/migrate";
export { createOrchestrationUnitOfWork } from "./infrastructure/orchestration-unit-of-work";
export {
	commandJournal,
	gateBindings,
	goals,
	runHeartbeats,
	runs,
	taskboardMirror,
	taskLeases,
	tasks,
} from "./infrastructure/persistence/schema";
export { createSystemLeaseClock } from "./infrastructure/system-lease-clock";
export {
	computeTaskboardHmac,
	resolveTaskboardHmacConfig,
	type TaskboardHmacConfig,
	verifyTaskboardHmac,
} from "./infrastructure/verify-taskboard-hmac";
