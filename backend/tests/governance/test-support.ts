import {
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

export { shouldRunPgIntegrationTests } from "../pg-harness-guard";

import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { TenantContext } from "@anxionos/database";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import type { Approval } from "../../modules/governance/src/domain/entities/approval";
import type { AutonomyAssignment } from "../../modules/governance/src/domain/entities/autonomy-assignment";
import type { ChangeProposal } from "../../modules/governance/src/domain/entities/change-proposal";
import type { Delegation } from "../../modules/governance/src/domain/entities/delegation";
import type { Grant } from "../../modules/governance/src/domain/entities/grant";
import type { Mandate } from "../../modules/governance/src/domain/entities/mandate";
import type { ApprovalRepository } from "../../modules/governance/src/domain/ports/approval-repository";
import type {
	AuthorityEpochRecord,
	AuthorityEpochStore,
} from "../../modules/governance/src/domain/ports/authority-epoch-store";
import type { AutonomyAssignmentRepository } from "../../modules/governance/src/domain/ports/autonomy-assignment-repository";
import type { ChangeProposalRepository } from "../../modules/governance/src/domain/ports/change-proposal-repository";
import {
	CommandJournalConflictError,
	type CommandJournalRecord,
	type CommandJournalRepository,
	type NewCommandJournalRecord,
} from "../../modules/governance/src/domain/ports/command-journal";
import type { DelegationRepository } from "../../modules/governance/src/domain/ports/delegation-repository";
import type {
	GovernanceTransactionContext,
	GovernanceUnitOfWork,
} from "../../modules/governance/src/domain/ports/governance-unit-of-work";
import type { GrantRepository } from "../../modules/governance/src/domain/ports/grant-repository";
import type { MandateRepository } from "../../modules/governance/src/domain/ports/mandate-repository";
import type { PrincipalLookup } from "../../modules/governance/src/domain/ports/principal-lookup";
import { ensureGovernanceSchema } from "../../modules/governance/src/infrastructure/migrate";

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
					grant.granteePrincipalId === principalId && grant.status === "active",
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
				// Mesma semantica do adapter PostgreSQL (ANX-476): colisao de
				// `command_id` e' conflito, nao devolucao da linha alheia.
				throw new CommandJournalConflictError(entry.commandId);
			}
			const stored: CommandJournalRecord = {
				...entry,
				requestHash: entry.requestHash ?? null,
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
	/**
	 * Disposicao ANX-476/E (LOW do G2): este UoW in-memory NAO faz rollback — o
	 * estado parcial de um `work` que lanca sobrevive. E' aceitavel de proposito:
	 * ele cobre o caminho feliz e as validacoes puras (os testes que o usam
	 * afirmam zero escrita APENAS quando o comando falha ANTES de gravar). Os
	 * caminhos de rollback de verdade — colisao de `command_id` derrubando o
	 * agregado do perdedor, re-leitura pos-bump de epoch — sao provados com
	 * PostgreSQL real nos testes de integracao (`integration/`), onde a
	 * transacao e' de fato atomica. Reimplementar transacao aqui seria uma
	 * segunda semantica para manter em sincronia, sem aumentar a confianca.
	 */
	const unitOfWork: GovernanceUnitOfWork = {
		async runInTransaction(
			ctx: TenantContext,
			work: (context: GovernanceTransactionContext) => Promise<T>,
		) {
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
	"PG integration tests require RUN_PG_INTEGRATION_TESTS=true|1|yes|on and a scratch DATABASE_URL (ANX-487)";

/**
 * Returns skip reason when tests should not run; null when they should run.
 *
 * ANX-487: delegates to the shared guard so `RUN_PG_INTEGRATION_TESTS` with an
 * unrecognized value, or an unsafe `DATABASE_URL` target, fails loudly instead
 * of becoming a skipped-but-green suite.
 */
export function getPgIntegrationTestSkipReason(): string | null {
	if (shouldRunPgIntegrationTests()) {
		return null;
	}
	return PG_INTEGRATION_SKIP_MESSAGE;
}

/** Fail CI when the PostgreSQL harness is requested but its target is unsafe. */
export function assertPgIntegrationEnvForCi(): void {
	// The guard throws for an unrecognized flag value, a missing/invalid
	// DATABASE_URL or a non-scratch target; a disabled/absent flag is a no-op.
	shouldRunPgIntegrationTests();
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
		await truncateDomainTables(pool, GOVERNANCE_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}
