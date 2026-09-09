import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { PoolClient } from "pg";
import type { ApprovalRepository } from "./approval-repository";
import type { AuthorityEpochStore } from "./authority-epoch-store";
import type { ChangeProposalRepository } from "./change-proposal-repository";
import type { CommandJournalRepository } from "./command-journal";
import type { GrantRepository } from "./grant-repository";

export interface GovernanceTransactionContext {
	client: PoolClient;
	grantRepository: GrantRepository;
	changeProposalRepository: ChangeProposalRepository;
	approvalRepository: ApprovalRepository;
	authorityEpochStore: AuthorityEpochStore;
	commandJournal: CommandJournalRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}

export interface GovernanceUnitOfWork {
	runInTransaction<T>(work: (context: GovernanceTransactionContext) => Promise<T>): Promise<T>;
}
