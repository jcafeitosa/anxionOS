import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { PoolClient } from "pg";
import type { TenantContext } from "./tenant-context";
import type { ApprovalRepository } from "./approval-repository";
import type { AuthorityEpochStore } from "./authority-epoch-store";
import type { ChangeProposalRepository } from "./change-proposal-repository";
import type { CommandJournalRepository } from "./command-journal";
import type { DelegationRepository } from "./delegation-repository";
import type { GrantRepository } from "./grant-repository";
import type { MandateRepository } from "./mandate-repository";
import type { AutonomyAssignmentRepository } from "./autonomy-assignment-repository";

export interface GovernanceTransactionContext {
	client: PoolClient;
	grantRepository: GrantRepository;
	delegationRepository: DelegationRepository;
	mandateRepository: MandateRepository;
	autonomyAssignmentRepository: AutonomyAssignmentRepository;
	changeProposalRepository: ChangeProposalRepository;
	approvalRepository: ApprovalRepository;
	authorityEpochStore: AuthorityEpochStore;
	commandJournal: CommandJournalRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}

export interface GovernanceUnitOfWork {
	runInTransaction<T>(
		ctx: TenantContext,
		work: (context: GovernanceTransactionContext) => Promise<T>,
	): Promise<T>;
}