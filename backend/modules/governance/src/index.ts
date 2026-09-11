export {
	canRevokeGrant,
	isGrantActive,
	isGrantEffectiveAt,
	isGrantRevoked,
	type Grant,
} from "./domain/entities/grant";
export {
	defaultRequiredApprovals,
	isChangeProposalPending,
	type ChangeProposal,
} from "./domain/entities/change-proposal";
export type { Approval } from "./domain/entities/approval";
export {
	createApprovalResolvedEvent,
	createAutonomyAssignedEvent,
	createAutonomyTransitionedEvent,
	createAuthorityEpochBumpedEvent,
	createChangeProposalSubmittedEvent,
	createBreakGlassActivatedEvent,
	createDelegationCreatedEvent,
	createGrantIssuedEvent,
	createGrantRevokedEvent,
	createMandateIssuedEvent,
} from "./domain/events/governance-events";
export type {
	ApprovalRepository,
	AutonomyAssignmentRepository,
	AuthorityEpochRecord,
	AuthorityEpochStore,
	ChangeProposalRepository,
	CommandJournalRecord,
	CommandJournalRepository,
	DelegationRepository,
	MandateRepository,
	GovernanceTransactionContext,
	GovernanceUnitOfWork,
	GrantRepository,
	NewCommandJournalRecord,
	PrincipalLookup,
	EvaluateT01Input,
	TraversalEvaluator,
} from "./domain/ports";
export { PrincipalLookupUnavailableError } from "./domain/ports";
export {
	issueGrant,
	type IssueGrantDeps,
	type IssueGrantInput,
} from "./application/commands/issue-grant";
export {
	revokeGrant,
	type RevokeGrantDeps,
} from "./application/commands/revoke-grant";
export {
	activateBreakGlass,
	type ActivateBreakGlassDeps,
} from "./application/commands/activate-break-glass";
export {
	createDelegation,
	type CreateDelegationDeps,
} from "./application/commands/create-delegation";
export {
	issueMandate,
	type IssueMandateDeps,
} from "./application/commands/issue-mandate";
export {
	submitChangeProposal,
	type SubmitChangeProposalDeps,
	type SubmitChangeProposalInput,
} from "./application/commands/submit-change-proposal";
export {
	resolveApproval,
	type ResolveApprovalDeps,
	type ResolveApprovalInput,
} from "./application/commands/resolve-approval";
export {
	getAuthorityEpoch,
	type GetAuthorityEpochDeps,
} from "./application/queries/get-authority-epoch";
export {
	listEffectiveGrants,
	type ListEffectiveGrantsDeps,
	type ListEffectiveGrantsInput,
} from "./application/queries/list-effective-grants";
export {
	hasPlatformConsoleGrant,
	type HasPlatformConsoleGrantDeps,
} from "./application/queries/has-platform-console-grant";
export {
	assignAutonomyLevel,
	type AssignAutonomyLevelDeps,
} from "./application/commands/assign-autonomy-level";
export {
	transitionAutonomyLevel,
	type TransitionAutonomyLevelDeps,
} from "./application/commands/transition-autonomy-level";
export {
	getEffectiveAutonomy,
	type GetEffectiveAutonomyDeps,
	type GetEffectiveAutonomyInput,
	type EffectiveAutonomyResult,
} from "./application/queries/get-effective-autonomy";
export {
	evaluateAutonomyCapability,
	type EvaluateAutonomyCapabilityInput,
	type EvaluateAutonomyCapabilityResult,
} from "./application/queries/evaluate-autonomy-capability";
export {
	validateAutonomyTransition,
	validateInitialAssignment,
	isAutonomyLevelRuntimeEnabled,
	isCapabilityEligibleAtLevel,
	getAutonomyLevelDefinition,
} from "./domain/policies/autonomy-normative-matrix";
export type { AutonomyAssignment } from "./domain/entities/autonomy-assignment";
export { GovernanceCommandError } from "./application/errors";
export { createGovernanceDb } from "./infrastructure/create-db";
export {
	createGraphT01TraversalEvaluator,
	GOVERNANCE_T01_DENY_REASONS,
	GOVERNANCE_T01_TIMEOUT_MS,
	type CreateGraphT01TraversalEvaluatorDeps,
	type GraphKernelT01EvaluationResult,
	type GraphKernelT01Evaluator,
} from "./infrastructure/adapters/graph-t01-traversal-evaluator";
export { createGovernanceUnitOfWork } from "./infrastructure/governance-unit-of-work";
export { createGovernanceInboxProcessor } from "./infrastructure/inbox-processor-adapter";
export { ensureGovernanceSchema } from "./infrastructure/migrate";
export {
	authorityEpochs,
	approvals,
	changeProposals,
	commandJournal,
	grants,
} from "./infrastructure/persistence/schema";
export {
	GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
	OWNER_BASELINE_CAPABILITIES,
} from "./application/consumers/constants";
export {
	OrganizationsMembershipConsumerError,
	createOrganizationsMembershipInboxConsumer,
	handleOrganizationsMembershipEvent,
	organizationsMembershipConsumer,
	processOrganizationsMembershipEvent,
	type OrganizationsMembershipConsumerDeps,
} from "./application/consumers/organizations-membership-consumer";
export type {
	OrganizationsMembershipReadOptions,
	OrganizationsMembershipReadPort,
	OrganizationsMembershipSnapshot,
} from "./domain/ports/organizations-membership-read-port";
