import type { TenantContext } from "@anxionos/database";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import { ensureGovernanceSchema } from "../../modules/governance/src/infrastructure/migrate";
import type { Approval } from "../../modules/governance/src/domain/entities/approval";
import type { ChangeProposal } from "../../modules/governance/src/domain/entities/change-proposal";
import type { Delegation } from "../../modules/governance/src/domain/entities/delegation";
import type { Grant } from "../../modules/governance/src/domain/entities/grant";
import type { AutonomyAssignment } from "../../modules/governance/src/domain/entities/autonomy-assignment";
import type { Mandate } from "../../modules/governance/src/domain/entities/mandate";
import type { DelegationRepository } from "../../modules/governance/src/domain/ports/delegation-repository";
import type { AutonomyAssignmentRepository } from "../../modules/governance/src/domain/ports/autonomy-assignment-repository";
import type { MandateRepository } from "../../modules/governance/src/domain/ports/mandate-repository";
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
import type {
	GovernanceTransactionContext,
	GovernanceUnitOfWork,
} from "../../modules/governance/src/domain/ports/governance-unit-of-work";
import type { GrantRepository } from "../../modules/governance/src/domain/ports/grant-repository";
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

export function createInMemoryGrantRepository(
	seed: Grant[] = [],
): GrantRepository {
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
		async listActiveByPrincipal(principalId) {
			return [...grants.values()].filter(
				(grant) =>
					grant.granteePrincipalId === principalId &&
					grant.status === "active",
			);
		},
		async listEffectiveForAgent(scopeId, subjectAgentId) {
			return [...grants.values()].filter(
				(grant) =>
					grant.scopeId === scopeId &&
					grant.granteeAgentId === subjectAgentId &&
					grant.status === "active",
			);
		},
		async findActiveByDerivedFromMembershipId(membershipId) {
			return [...grants.values()].filter(
				(grant) =>
					grant.derivedFromMembershipId === membershipId &&
					grant.status === "active",
			);
		},
	};
}

export function createInMemoryChangeProposalRepository(
	seed: ChangeProposal[] = [],
): ChangeProposalRepository {
	const proposals = new Map(
		seed.map((proposal) => [proposal.id, { ...proposal }]),
	);
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
				(proposal) =>
					proposal.scopeId === scopeId && proposal.status === "pending",
			);
		},
	};
}

export function createInMemoryApprovalRepository(
	seed: Approval[] = [],
): ApprovalRepository {
	const approvals = new Map(
		seed.map((approval) => [approval.id, { ...approval }]),
	);
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
				tenantId: "",
				agencyId: "",
				scopeId,
				epoch: 0,
				updatedAt: new Date(),
			};
			epochs.set(scopeId, initial);
			return { ...initial };
		},
		async increment(scopeId, tenantId, agencyId) {
			const current = await this.get(scopeId);
			const bumped: AuthorityEpochRecord = {
				tenantId,
				agencyId,
				scopeId,
				epoch: current.epoch + 1,
				updatedAt: new Date(),
			};
			epochs.set(scopeId, bumped);
			return { ...bumped };
		},
	};
}

export function createInMemoryMandateRepository(
	seed: Mandate[] = [],
): MandateRepository {
	const mandates = new Map(seed.map((item) => [item.id, { ...item }]));
	return {
		async save(mandate) {
			mandates.set(mandate.id, { ...mandate });
			return { ...mandate };
		},
		async findById(mandateId) {
			return mandates.get(mandateId) ?? null;
		},
		async findActiveByAgentAndAgency(agentId, agencyId) {
			for (const mandate of mandates.values()) {
				if (
					mandate.agentId === agentId &&
					mandate.agencyId === agencyId &&
					mandate.status === "active"
				) {
					return { ...mandate };
				}
			}
			return null;
		},
	};
}

export function createInMemoryAutonomyAssignmentRepository(
	seed: AutonomyAssignment[] = [],
): AutonomyAssignmentRepository {
	const assignments = new Map(seed.map((item) => [item.id, { ...item }]));
	return {
		async save(assignment) {
			assignments.set(assignment.id, { ...assignment });
			return { ...assignment };
		},
		async findById(assignmentId) {
			return assignments.get(assignmentId) ?? null;
		},
		async findActiveByAgentAndScope(scopeId, subjectAgentId) {
			for (const assignment of assignments.values()) {
				if (
					assignment.scopeId === scopeId &&
					assignment.subjectAgentId === subjectAgentId &&
					assignment.status === "active"
				) {
					return { ...assignment };
				}
			}
			return null;
		},
	};
}

export function createInMemoryDelegationRepository(
	seed: Delegation[] = [],
): DelegationRepository {
	const delegations = new Map(seed.map((item) => [item.id, { ...item }]));
	return {
		async save(delegation) {
			delegations.set(delegation.id, { ...delegation });
			return { ...delegation };
		},
		async findById(delegationId) {
			return delegations.get(delegationId) ?? null;
		},
	};
}

export function createInMemoryCommandJournalRepository(
	seed: CommandJournalRecord[] = [],
): CommandJournalRepository {
	const records = new Map(
		seed.map((record) => [record.commandId, { ...record }]),
	);
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
	delegationRepository?: DelegationRepository;
	mandateRepository?: MandateRepository;
	autonomyAssignmentRepository?: AutonomyAssignmentRepository;
	changeProposalRepository: ChangeProposalRepository;
	approvalRepository: ApprovalRepository;
	authorityEpochStore: AuthorityEpochStore;
	commandJournal: CommandJournalRepository;
}): { unitOfWork: GovernanceUnitOfWork; published: DomainEventEnvelope[] } {
	const published: DomainEventEnvelope[] = [];
	const delegationRepository =
		deps.delegationRepository ?? createInMemoryDelegationRepository();
	const mandateRepository =
		deps.mandateRepository ?? createInMemoryMandateRepository();
	const autonomyAssignmentRepository =
		deps.autonomyAssignmentRepository ??
		createInMemoryAutonomyAssignmentRepository();
	let transactionChain: Promise<unknown> = Promise.resolve();
	const unitOfWork: GovernanceUnitOfWork = {
		async runInTransaction(ctx: TenantContext, work: (context: GovernanceTransactionContext) => Promise<T>) {
			const run = transactionChain.then(async () => {
				const context: GovernanceTransactionContext = {
					client: null as never,
					grantRepository: deps.grantRepository,
					delegationRepository,
					mandateRepository,
					autonomyAssignmentRepository,
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

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}


export const PG_INTEGRATION_SKIP_MESSAGE =
	"PG integration tests require RUN_PG_INTEGRATION_TESTS=true and DATABASE_URL";

/** Returns skip reason when tests should not run; null when they should run. */
export function getPgIntegrationTestSkipReason(): string | null {
	if (process.env.RUN_PG_INTEGRATION_TESTS !== "true") {
		return PG_INTEGRATION_SKIP_MESSAGE;
	}
	return null;
}

/** Fail CI when RUN_PG_INTEGRATION_TESTS=true but DATABASE_URL is missing. */
export function assertPgIntegrationEnvForCi(): void {
	if (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" &&
		!getDatabaseUrl()
	) {
		throw new Error(
			`${PG_INTEGRATION_SKIP_MESSAGE} — RUN_PG_INTEGRATION_TESTS=true but DATABASE_URL is unset`,
		);
	}
}

export function shouldRunPgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" && Boolean(getDatabaseUrl())
	);
}

const GOVERNANCE_TRUNCATE_SQL =
	"TRUNCATE governance_autonomy_assignments, governance_command_journal, governance_authority_epochs, governance_grants, governance_change_proposals, governance_approvals, governance_delegations, governance_mandates, domain_journal, outbox RESTART IDENTITY CASCADE";

export async function withGovernancePgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureGovernanceSchema(pool);
		await pool.query(GOVERNANCE_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}
