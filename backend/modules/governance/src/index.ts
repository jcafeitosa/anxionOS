export {
	type ActivateBreakGlassDeps,
	activateBreakGlass,
} from "./application/commands/activate-break-glass";
export {
	type AssignAutonomyLevelDeps,
	assignAutonomyLevel,
} from "./application/commands/assign-autonomy-level";
export {
	type CreateDelegationDeps,
	createDelegation,
} from "./application/commands/create-delegation";
export {
	type IssueGrantDeps,
	type IssueGrantInput,
	issueGrant,
} from "./application/commands/issue-grant";
export {
	type IssueMandateDeps,
	issueMandate,
} from "./application/commands/issue-mandate";
export {
	type ResolveApprovalDeps,
	type ResolveApprovalInput,
	resolveApproval,
} from "./application/commands/resolve-approval";
export {
	type RevokeGrantDeps,
	revokeGrant,
} from "./application/commands/revoke-grant";
export {
	type SubmitChangeProposalDeps,
	type SubmitChangeProposalInput,
	submitChangeProposal,
} from "./application/commands/submit-change-proposal";
export {
	type TransitionAutonomyLevelDeps,
	transitionAutonomyLevel,
} from "./application/commands/transition-autonomy-level";
export {
	GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME,
	OWNER_BASELINE_CAPABILITIES,
} from "./application/consumers/constants";
export {
	createOrganizationsMembershipInboxConsumer,
	handleOrganizationsMembershipEvent,
	type OrganizationsMembershipConsumerDeps,
	OrganizationsMembershipConsumerError,
	organizationsMembershipConsumer,
	processOrganizationsMembershipEvent,
} from "./application/consumers/organizations-membership-consumer";
export { GovernanceCommandError } from "./application/errors";
export {
	type EvaluateAutonomyCapabilityInput,
	type EvaluateAutonomyCapabilityResult,
	evaluateAutonomyCapability,
} from "./application/queries/evaluate-autonomy-capability";
export {
	type GetAuthorityEpochDeps,
	getAuthorityEpoch,
} from "./application/queries/get-authority-epoch";
export {
	type EffectiveAutonomyResult,
	type GetEffectiveAutonomyDeps,
	type GetEffectiveAutonomyInput,
	getEffectiveAutonomy,
} from "./application/queries/get-effective-autonomy";
export {
	type HasCapabilityDeps,
	type HasCapabilityInput,
	hasCapability,
} from "./application/queries/has-capability";
export {
	type HasPlatformConsoleGrantDeps,
	hasPlatformConsoleGrant,
} from "./application/queries/has-platform-console-grant";
export {
	type ListEffectiveGrantsDeps,
	type ListEffectiveGrantsInput,
	listEffectiveGrants,
} from "./application/queries/list-effective-grants";
export type { Approval } from "./domain/entities/approval";
export type { AutonomyAssignment } from "./domain/entities/autonomy-assignment";
export {
	type ChangeProposal,
	defaultRequiredApprovals,
	isChangeProposalPending,
} from "./domain/entities/change-proposal";
export {
	canRevokeGrant,
	type Grant,
	isGrantActive,
	isGrantEffectiveAt,
	isGrantRevoked,
} from "./domain/entities/grant";
export {
	createApprovalResolvedEvent,
	createAuthorityEpochBumpedEvent,
	createAutonomyAssignedEvent,
	createAutonomyTransitionedEvent,
	createBreakGlassActivatedEvent,
	createChangeProposalSubmittedEvent,
	createDelegationCreatedEvent,
	createGrantIssuedEvent,
	createGrantRevokedEvent,
	createMandateIssuedEvent,
} from "./domain/events/governance-events";
export {
	getAutonomyLevelDefinition,
	isAutonomyLevelRuntimeEnabled,
	isCapabilityEligibleAtLevel,
	validateAutonomyTransition,
	validateInitialAssignment,
} from "./domain/policies/autonomy-normative-matrix";
export type {
	ApprovalRepository,
	AuthorityEpochRecord,
	AuthorityEpochStore,
	AutonomyAssignmentRepository,
	ChangeProposalRepository,
	CommandJournalRecord,
	CommandJournalRepository,
	DelegationRepository,
	EvaluateT01Input,
	GovernanceTransactionContext,
	GovernanceUnitOfWork,
	GrantRepository,
	MandateRepository,
	NewCommandJournalRecord,
	PrincipalLookup,
	TraversalEvaluator,
} from "./domain/ports";
export { PrincipalLookupUnavailableError } from "./domain/ports";
export type {
	OrganizationsMembershipReadOptions,
	OrganizationsMembershipReadPort,
	OrganizationsMembershipSnapshot,
} from "./domain/ports/organizations-membership-read-port";
export {
	type CreateGraphT01TraversalEvaluatorDeps,
	createGraphT01TraversalEvaluator,
	GOVERNANCE_T01_DENY_REASONS,
	GOVERNANCE_T01_TIMEOUT_MS,
	type GraphKernelT01EvaluationResult,
	type GraphKernelT01Evaluator,
} from "./infrastructure/adapters/graph-t01-traversal-evaluator";
export { createGovernanceDb } from "./infrastructure/create-db";
export { createGovernanceUnitOfWork } from "./infrastructure/governance-unit-of-work";
export { createGovernanceInboxProcessor } from "./infrastructure/inbox-processor-adapter";
export { ensureGovernanceSchema } from "./infrastructure/migrate";
export {
	approvals,
	authorityEpochs,
	changeProposals,
	commandJournal,
	grants,
} from "./infrastructure/persistence/schema";
