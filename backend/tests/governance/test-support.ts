import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { Approval } from "../../modules/governance/src/domain/entities/approval";
import type { ChangeProposal } from "../../modules/governance/src/domain/entities/change-proposal";
import type { Grant } from "../../modules/governance/src/domain/entities/grant";
import type { ApprovalRepository } from "../../modules/governance/src/domain/ports/approval-repository";
import type {
	AuthorityEpochRecord,
	AuthorityEpochStore,
} from "../../modules/governance/src/domain/ports/authority-epoch-store";
import type { ChangeProposalRepository } from "../../modules/governance/src/domain/ports/change-proposal-repository";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
	NewCommandJournalRecord,
} from "../../modules/governance/src/domain/ports/command-journal";
import type { GrantRepository } from "../../modules/governance/src/domain/ports/grant-repository";
import type {
	GovernanceTransactionContext,
	GovernanceUnitOfWork,
} from "../../modules/governance/src/domain/ports/governance-unit-of-work";
import type { PrincipalLookup } from "../../modules/governance/src/domain/ports/principal-lookup";

export function createStubPrincipalLookup(
	existingPrincipalIds: string[] = [],
): PrincipalLookup {
	const principals = new Set(existingPrincipalIds);
	return {
		async exists(principalId) {
			return principals.has(principalId);
		},
	};
}

export function createInMemoryGrantRepository(seed: Grant[] = []): GrantRepository {
	const grants = new Map(seed.map((grant) => [grant.id, { ...grant }]));
	return {
		async save(grant) {
			grants.set(grant.id, { ...grant });
			return { ...grant };
		},
		async findById(grantId) {
			return grants.get(grantId) ?? null;
		},
		async listEffective(scopeId, principalId) {
			return [...grants.values()].filter(
				(grant) =>
					grant.scopeId === scopeId &&
					grant.granteePrincipalId === principalId &&
					grant.status === "active",
			);
		},
		async findActiveByDerivedFromMembershipId(membershipId) {
			return [...grants.values()].filter(
				(grant) =>
					grant.derivedFromMembershipId === membershipId && grant.status === "active",
			);
		},
	};
}

export function createInMemoryChangeProposalRepository(
	seed: ChangeProposal[] = [],
): ChangeProposalRepository {
	const proposals = new Map(seed.map((proposal) => [proposal.id, { ...proposal }]));
	return {
		async save(proposal) {
			proposals.set(proposal.id, { ...proposal });
			return { ...proposal };
		},
		async findById(proposalId) {
			return proposals.get(proposalId) ?? null;
		},
		async findPendingByScope(scopeId) {
			return [...proposals.values()].filter(
				(proposal) => proposal.scopeId === scopeId && proposal.status === "pending",
			);
		},
	};
}

export function createInMemoryApprovalRepository(seed: Approval[] = []): ApprovalRepository {
	const approvals = new Map(seed.map((approval) => [approval.id, { ...approval }]));
	return {
		async save(approval) {
			approvals.set(approval.id, { ...approval });
			return { ...approval };
		},
		async findByChangeProposalId(changeProposalId) {
			for (const approval of approvals.values()) {
				if (approval.changeProposalId === changeProposalId) {
					return approval;
				}
			}
			return null;
		},
	};
}

export function createInMemoryAuthorityEpochStore(
	seed: AuthorityEpochRecord[] = [],
): AuthorityEpochStore {
	const epochs = new Map(seed.map((record) => [record.scopeId, { ...record }]));
	return {
		async get(scopeId) {
			const existing = epochs.get(scopeId);
			if (existing) {
				return { ...existing };
			}
			const initial: AuthorityEpochRecord = {
				scopeId,
				epoch: 0,
				updatedAt: new Date(),
			};
			epochs.set(scopeId, initial);
			return { ...initial };
		},
		async increment(scopeId) {
			const current = await this.get(scopeId);
			const bumped: AuthorityEpochRecord = {
				scopeId,
				epoch: current.epoch + 1,
				updatedAt: new Date(),
			};
			epochs.set(scopeId, bumped);
			return { ...bumped };
		},
	};
}

export function createInMemoryCommandJournalRepository(
	seed: CommandJournalRecord[] = [],
): CommandJournalRepository {
	const records = new Map(seed.map((record) => [record.commandId, { ...record }]));
	return {
		async findByCommandId(commandId) {
			return records.get(commandId) ?? null;
		},
		async record(entry: NewCommandJournalRecord) {
			const existing = records.get(entry.commandId);
			if (existing) {
				return existing;
			}
			const stored: CommandJournalRecord = {
				...entry,
				createdAt: new Date(),
			};
			records.set(entry.commandId, stored);
			return stored;
		},
	};
}

export function createRecordingGovernanceUnitOfWork(deps: {
	grantRepository: GrantRepository;
	changeProposalRepository: ChangeProposalRepository;
	approvalRepository: ApprovalRepository;
	authorityEpochStore: AuthorityEpochStore;
	commandJournal: CommandJournalRepository;
}): { unitOfWork: GovernanceUnitOfWork; published: DomainEventEnvelope[] } {
	const published: DomainEventEnvelope[] = [];
	let transactionChain: Promise<unknown> = Promise.resolve();
	const unitOfWork: GovernanceUnitOfWork = {
		async runInTransaction(work) {
			const run = transactionChain.then(async () => {
				const context: GovernanceTransactionContext = {
					client: null as never,
					grantRepository: deps.grantRepository,
					changeProposalRepository: deps.changeProposalRepository,
					approvalRepository: deps.approvalRepository,
					authorityEpochStore: deps.authorityEpochStore,
					commandJournal: deps.commandJournal,
					async publishEvents(envelopes) {
						published.push(...envelopes);
					},
				};
				return work(context);
			});
			transactionChain = run.catch(() => undefined);
			return run;
		},
	};
	return { unitOfWork, published };
}
