export {
	canRevokeGrant,
	isGrantActive,
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
	createAuthorityEpochBumpedEvent,
	createChangeProposalSubmittedEvent,
	createGrantIssuedEvent,
	createGrantRevokedEvent,
} from "./domain/events/governance-events";
export type {
	ApprovalRepository,
	AuthorityEpochRecord,
	AuthorityEpochStore,
	ChangeProposalRepository,
	CommandJournalRecord,
	CommandJournalRepository,
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
	submitChangeProposal,
	type SubmitChangeProposalDeps,
	type SubmitChangeProposalInput,
} from "./application/commands/submit-change-proposal";
export {
	resolveApproval,
	type ResolveApprovalDeps,
	type ResolveApprovalInput,
} from "./application/commands/resolve-approval";
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
