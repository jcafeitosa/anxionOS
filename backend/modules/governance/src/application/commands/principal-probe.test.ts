import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { GovernanceCommandResult } from "@anxionos/contracts/governance";
import type { ChangeProposal } from "../../domain/entities/change-proposal";
import type { Delegation } from "../../domain/entities/delegation";
import type { Grant } from "../../domain/entities/grant";
import type {
	AuthorityEpochRecord,
	AuthorityEpochStore,
} from "../../domain/ports/authority-epoch-store";
import type { ChangeProposalRepository } from "../../domain/ports/change-proposal-repository";
import {
	CommandJournalConflictError,
	type CommandJournalRecord,
	type CommandJournalRepository,
} from "../../domain/ports/command-journal";
import type { DelegationRepository } from "../../domain/ports/delegation-repository";
import type {
	GovernanceTransactionContext,
	GovernanceUnitOfWork,
} from "../../domain/ports/governance-unit-of-work";
import type { GrantRepository } from "../../domain/ports/grant-repository";
import {
	type PrincipalLookup,
	PrincipalLookupUnavailableError,
} from "../../domain/ports/principal-lookup";
import { hashCommandPayload } from "../command-support";
import { GovernanceCommandError } from "../errors";
import { activateBreakGlass } from "./activate-break-glass";
import { createDelegation } from "./create-delegation";
import { issueGrant } from "./issue-grant";
import { submitChangeProposal } from "./submit-change-proposal";

/**
 * ANX-477 — oraculo determinístico e local ao modulo.
 *
 * O defeito era de ORDEM: `principalLookup.exists` rodava DENTRO de
 * `runInTransaction`, pedindo uma SEGUNDA conexao do mesmo pool enquanto a
 * transacao ja' segurava a primeira (pool starvation sob rajada, N ~ `pool.max`).
 * Os fakes abaixo instrumentam as duas fronteiras (port de identidade e
 * unit-of-work) e registram uma trilha ORDENADA + se a consulta aconteceu com a
 * transacao aberta. Nenhum PostgreSQL real e' necessario: o que se prova aqui e'
 * a ordem de aquisicao e a semantica de idempotencia, nao a transacao do driver.
 */

const SCOPE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_GRANT_ID = "22222222-2222-4222-8222-222222222222";
const GRANTEE_OWNER_ID = "33333333-3333-4333-8333-333333333333";
const CAPABILITY = "owner.manage";
const BASE_TIME = new Date("2026-09-12T00:00:00.000Z");
/**
 * Determinístico POR IMPORT: `activateBreakGlass` exige `expiresAt` futuro e
 * dentro de 24h, e o replay compara `existing.validUntil` com o mesmo instante.
 * Se fosse recalculado por chamada, o seed e o invoke divergiriam por
 * milissegundos e o `matchesAggregate` devolveria 409 falso.
 */
const BREAK_GLASS_EXPIRES_AT = new Date(
	Date.now() + 60 * 60 * 1000,
).toISOString();
const DELEGATION_VALID_UNTIL = new Date(
	Date.now() + 60 * 60 * 1000,
).toISOString();

type LookupBehavior = "present" | "absent" | "unavailable";

interface HarnessState {
	behavior: LookupBehavior;
	trace: string[];
	transactionOpen: boolean;
	transactionOpens: number;
	lookupCalls: number;
	lookupCallsDuringTransaction: number;
	saves: number;
}

interface Harness {
	deps: {
		unitOfWork: GovernanceUnitOfWork;
		commandJournal: CommandJournalRepository;
		grantRepository: GrantRepository;
		principalLookup: PrincipalLookup;
	};
	state: HarnessState;
	grants: Map<string, Grant>;
	proposals: Map<string, ChangeProposal>;
	delegations: Map<string, Delegation>;
	journal: Map<string, CommandJournalRecord>;
	setLookupBehavior(behavior: LookupBehavior): void;
}

function buildGrant(overrides: Partial<Grant> & Pick<Grant, "id">): Grant {
	return {
		tenantId: SCOPE_ID,
		agencyId: SCOPE_ID,
		scopeId: SCOPE_ID,
		scopeKind: "agency",
		granteePrincipalId: GRANTEE_OWNER_ID,
		granteeAgentId: null,
		issuedByPrincipalId: null,
		capability: CAPABILITY,
		resourceRef: null,
		status: "active",
		validFrom: new Date("2026-01-01T00:00:00.000Z"),
		validUntil: null,
		derivedFromMembershipId: null,
		authorityEpochAtIssue: 0,
		revision: 1,
		createdAt: BASE_TIME,
		updatedAt: BASE_TIME,
		...overrides,
	};
}

function createHarness(behavior: LookupBehavior): Harness {
	const state: HarnessState = {
		behavior,
		trace: [],
		transactionOpen: false,
		transactionOpens: 0,
		lookupCalls: 0,
		lookupCallsDuringTransaction: 0,
		saves: 0,
	};
	const grants = new Map<string, Grant>();
	const proposals = new Map<string, ChangeProposal>();
	const delegations = new Map<string, Delegation>();
	const journal = new Map<string, CommandJournalRecord>();
	const epochs = new Map<string, AuthorityEpochRecord>();

	const grantRepository: GrantRepository = {
		async save(grant) {
			state.saves += 1;
			grants.set(grant.id, { ...grant });
			return { ...grant };
		},
		async findById(grantId) {
			const found = grants.get(grantId);
			return found ? { ...found } : null;
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

	const changeProposalRepository: ChangeProposalRepository = {
		async save(proposal) {
			state.saves += 1;
			proposals.set(proposal.id, { ...proposal });
			return { ...proposal };
		},
		async findById(proposalId) {
			const found = proposals.get(proposalId);
			return found ? { ...found } : null;
		},
		async findPendingByScope(scopeId) {
			return [...proposals.values()].filter(
				(proposal) =>
					proposal.scopeId === scopeId && proposal.status === "pending",
			);
		},
	};

	const delegationRepository: DelegationRepository = {
		async save(delegation) {
			state.saves += 1;
			delegations.set(delegation.id, { ...delegation });
			return { ...delegation };
		},
		async findById(delegationId) {
			const found = delegations.get(delegationId);
			return found ? { ...found } : null;
		},
	};

	const authorityEpochStore: AuthorityEpochStore = {
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
				updatedAt: BASE_TIME,
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
				updatedAt: BASE_TIME,
			};
			epochs.set(scopeId, bumped);
			return { ...bumped };
		},
	};

	const commandJournal: CommandJournalRepository = {
		async findByCommandId(commandId) {
			const found = journal.get(commandId);
			return found ? { ...found } : null;
		},
		async record(entry) {
			if (journal.has(entry.commandId)) {
				// Mesma semantica do adapter PostgreSQL (ANX-476): colisao de
				// `command_id` e' conflito, nao devolucao da linha alheia.
				throw new CommandJournalConflictError(entry.commandId);
			}
			const stored: CommandJournalRecord = {
				...entry,
				requestHash: entry.requestHash ?? null,
				createdAt: BASE_TIME,
			};
			journal.set(entry.commandId, stored);
			return { ...stored };
		},
	};

	const context: GovernanceTransactionContext = {
		client: null as never,
		grantRepository,
		delegationRepository,
		mandateRepository: {} as GovernanceTransactionContext["mandateRepository"],
		autonomyAssignmentRepository:
			{} as GovernanceTransactionContext["autonomyAssignmentRepository"],
		changeProposalRepository,
		approvalRepository:
			{} as GovernanceTransactionContext["approvalRepository"],
		authorityEpochStore,
		commandJournal,
		async publishEvents() {},
	};

	const unitOfWork: GovernanceUnitOfWork = {
		async runInTransaction(_ctx, work) {
			state.transactionOpens += 1;
			state.trace.push("transaction.open");
			state.transactionOpen = true;
			try {
				return await work(context);
			} finally {
				state.transactionOpen = false;
				state.trace.push("transaction.close");
			}
		},
	};

	const principalLookup: PrincipalLookup = {
		async exists() {
			state.lookupCalls += 1;
			state.trace.push("principalLookup.exists");
			if (state.transactionOpen) {
				// O ponto do defeito: uma consulta aqui exige uma SEGUNDA conexao
				// do pool com a transacao ainda segurando a primeira.
				state.lookupCallsDuringTransaction += 1;
			}
			if (state.behavior === "unavailable") {
				throw new PrincipalLookupUnavailableError(
					"identity service unavailable",
				);
			}
			return state.behavior === "present";
		},
	};

	return {
		deps: { unitOfWork, commandJournal, grantRepository, principalLookup },
		state,
		grants,
		proposals,
		delegations,
		journal,
		setLookupBehavior(next) {
			state.behavior = next;
		},
	};
}

function seedJournal(
	harness: Harness,
	entry: {
		commandId: string;
		commandName: string;
		aggregateId: string;
		responseSnapshot: Record<string, unknown>;
		requestHash?: string | null;
	},
): void {
	harness.journal.set(entry.commandId, {
		commandId: entry.commandId,
		commandName: entry.commandName,
		aggregateId: entry.aggregateId,
		aggregateType: entry.commandName,
		revision: 1,
		responseSnapshot: entry.responseSnapshot,
		requestHash: entry.requestHash ?? null,
		createdAt: BASE_TIME,
	});
}

interface CommandCase {
	name: string;
	/** Estado que a transacao NAO cria (ex.: grant pai da delegacao). */
	prepare(harness: Harness): void;
	invoke(
		deps: Harness["deps"],
		commandId: string,
	): Promise<GovernanceCommandResult>;
	/** Grava a linha do journal + agregado que o replay deve devolver. */
	seedReplay(harness: Harness, commandId: string): string;
}

const COMMAND_CASES: CommandCase[] = [
	{
		name: "issueGrant",
		prepare() {},
		async invoke(deps, commandId) {
			return issueGrant(deps, {
				commandId,
				scopeId: SCOPE_ID,
				issuedByPrincipalId: null,
				granteePrincipalId: PRINCIPAL_ID,
				capability: CAPABILITY,
			});
		},
		seedReplay(harness, commandId) {
			const aggregateId = randomUUID();
			harness.grants.set(
				aggregateId,
				buildGrant({
					id: aggregateId,
					granteePrincipalId: PRINCIPAL_ID,
					capability: CAPABILITY,
					scopeId: SCOPE_ID,
				}),
			);
			seedJournal(harness, {
				commandId,
				commandName: "IssueGrant",
				aggregateId,
				responseSnapshot: { aggregateId, revision: 1, authorityEpoch: 1 },
			});
			return aggregateId;
		},
	},
	{
		name: "submitChangeProposal",
		prepare() {},
		async invoke(deps, commandId) {
			return submitChangeProposal(deps, {
				commandId,
				scopeId: SCOPE_ID,
				kind: "SOFTWARE",
				payloadHash: "payload-hash",
				proposerPrincipalId: PRINCIPAL_ID,
			});
		},
		seedReplay(harness, commandId) {
			const aggregateId = randomUUID();
			harness.proposals.set(aggregateId, {
				id: aggregateId,
				tenantId: SCOPE_ID,
				agencyId: SCOPE_ID,
				scopeId: SCOPE_ID,
				kind: "SOFTWARE",
				payloadHash: "payload-hash",
				proposerPrincipalId: PRINCIPAL_ID,
				status: "pending",
				requiredApprovals: 1,
				revision: 1,
				createdAt: BASE_TIME,
				updatedAt: BASE_TIME,
			});
			seedJournal(harness, {
				commandId,
				commandName: "SubmitChangeProposal",
				aggregateId,
				responseSnapshot: { aggregateId, revision: 1 },
			});
			return aggregateId;
		},
	},
	{
		name: "activateBreakGlass",
		prepare() {},
		async invoke(deps, commandId) {
			return activateBreakGlass(deps, {
				commandId,
				scopeId: SCOPE_ID,
				granteePrincipalId: PRINCIPAL_ID,
				capability: CAPABILITY,
				reason: "incident drill",
				expiresAt: BREAK_GLASS_EXPIRES_AT,
			});
		},
		seedReplay(harness, commandId) {
			const aggregateId = randomUUID();
			harness.grants.set(
				aggregateId,
				buildGrant({
					id: aggregateId,
					granteePrincipalId: PRINCIPAL_ID,
					capability: CAPABILITY,
					resourceRef: `break-glass:${commandId}`,
					validUntil: new Date(BREAK_GLASS_EXPIRES_AT),
				}),
			);
			seedJournal(harness, {
				commandId,
				commandName: "ActivateBreakGlass",
				aggregateId,
				requestHash: hashCommandPayload({
					scopeId: SCOPE_ID,
					granteePrincipalId: PRINCIPAL_ID,
					capability: CAPABILITY,
					reason: "incident drill",
					expiresAt: BREAK_GLASS_EXPIRES_AT,
					incidentRef: commandId,
				}),
				responseSnapshot: { aggregateId, revision: 1, authorityEpoch: 1 },
			});
			return aggregateId;
		},
	},
	{
		name: "createDelegation",
		prepare(harness) {
			harness.grants.set(
				PARENT_GRANT_ID,
				buildGrant({
					id: PARENT_GRANT_ID,
					granteePrincipalId: GRANTEE_OWNER_ID,
					capability: CAPABILITY,
				}),
			);
		},
		async invoke(deps, commandId) {
			return createDelegation(deps, {
				commandId,
				parentGrantId: PARENT_GRANT_ID,
				delegatePrincipalId: PRINCIPAL_ID,
				capabilitySubset: [CAPABILITY],
				validUntil: DELEGATION_VALID_UNTIL,
			});
		},
		seedReplay(harness, commandId) {
			const aggregateId = randomUUID();
			harness.delegations.set(aggregateId, {
				id: aggregateId,
				tenantId: SCOPE_ID,
				agencyId: SCOPE_ID,
				parentGrantId: PARENT_GRANT_ID,
				delegatePrincipalId: PRINCIPAL_ID,
				capabilitySubset: [CAPABILITY],
				intentHash: null,
				validUntil: new Date(DELEGATION_VALID_UNTIL),
				status: "active",
				revision: 1,
				createdAt: BASE_TIME,
				updatedAt: BASE_TIME,
			});
			seedJournal(harness, {
				commandId,
				commandName: "CreateDelegation",
				aggregateId,
				responseSnapshot: { aggregateId, revision: 1, authorityEpoch: 1 },
			});
			return aggregateId;
		},
	},
];

describe("ANX-477 — ordem de aquisicao: sonda de principal fora da transacao", () => {
	for (const commandCase of COMMAND_CASES) {
		test(`${commandCase.name}: consulta a identidade ANTES de abrir a transacao`, async () => {
			const harness = createHarness("present");
			commandCase.prepare(harness);
			await commandCase.invoke(harness.deps, randomUUID());
			const lookupIndex = harness.state.trace.indexOf("principalLookup.exists");
			const transactionIndex = harness.state.trace.indexOf("transaction.open");
			expect(lookupIndex).toBeGreaterThanOrEqual(0);
			expect(transactionIndex).toBeGreaterThanOrEqual(0);
			expect(lookupIndex).toBeLessThan(transactionIndex);
			// A prova direta do defeito: nenhuma chamada ao pool de identidade
			// acontece enquanto a transacao segura a conexao.
			expect(harness.state.lookupCallsDuringTransaction).toBe(0);
			expect(harness.state.transactionOpens).toBe(1);
		});
	}
});

describe("ANX-477 — replay com identidade indisponivel devolve o journal", () => {
	for (const commandCase of COMMAND_CASES) {
		test(`${commandCase.name}: retorna o resultado journalado sem lancar`, async () => {
			const harness = createHarness("present");
			commandCase.prepare(harness);
			const commandId = randomUUID();
			const aggregateId = commandCase.seedReplay(harness, commandId);
			harness.setLookupBehavior("unavailable");
			const result = await commandCase.invoke(harness.deps, commandId);
			expect(result.idempotentReplay).toBe(true);
			expect(result.aggregateId).toBe(aggregateId);
			expect(harness.state.saves).toBe(0);
		});
	}

	test("issueGrant: replay de uma execucao real sobrevive a identidade fora", async () => {
		const harness = createHarness("present");
		const commandId = randomUUID();
		const issued = await issueGrant(harness.deps, {
			commandId,
			scopeId: SCOPE_ID,
			issuedByPrincipalId: null,
			granteePrincipalId: PRINCIPAL_ID,
			capability: CAPABILITY,
		});
		harness.setLookupBehavior("unavailable");
		const replay = await issueGrant(harness.deps, {
			commandId,
			scopeId: SCOPE_ID,
			issuedByPrincipalId: null,
			granteePrincipalId: PRINCIPAL_ID,
			capability: CAPABILITY,
		});
		expect(replay).toEqual({ ...issued, idempotentReplay: true });
	});
});

describe("ANX-477 — comando novo com identidade indisponivel propaga o erro original", () => {
	for (const commandCase of COMMAND_CASES) {
		test(`${commandCase.name}: lanca PrincipalLookupUnavailableError e nao grava`, async () => {
			const harness = createHarness("unavailable");
			commandCase.prepare(harness);
			const commandId = randomUUID();
			await expect(
				commandCase.invoke(harness.deps, commandId),
			).rejects.toBeInstanceOf(PrincipalLookupUnavailableError);
			expect(harness.state.saves).toBe(0);
			expect(harness.journal.has(commandId)).toBe(false);
		});
	}
});

describe("ANX-477 — principal inexistente falha fechado sem gravar agregado", () => {
	for (const commandCase of COMMAND_CASES) {
		test(`${commandCase.name}: GOV_PRINCIPAL_NOT_FOUND`, async () => {
			const harness = createHarness("absent");
			commandCase.prepare(harness);
			const commandId = randomUUID();
			const pending = commandCase.invoke(harness.deps, commandId);
			await expect(pending).rejects.toBeInstanceOf(GovernanceCommandError);
			await expect(pending).rejects.toMatchObject({
				governanceCode: "GOV_PRINCIPAL_NOT_FOUND",
			});
			expect(harness.state.saves).toBe(0);
			expect(harness.journal.has(commandId)).toBe(false);
		});
	}
});
