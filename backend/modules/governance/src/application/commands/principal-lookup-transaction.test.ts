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
import type {
	PrincipalLookup,
	PrincipalLookupOptions,
} from "../../domain/ports/principal-lookup";
import { hashCommandPayload } from "../command-support";
import { GovernanceCommandError } from "../errors";
import { activateBreakGlass } from "./activate-break-glass";
import { createDelegation } from "./create-delegation";
import { issueGrant } from "./issue-grant";
import { submitChangeProposal } from "./submit-change-proposal";

/**
 * ANX-477 (rodada 2) — ordem de aquisicao da identidade.
 *
 * O defeito: `principalLookup.exists` rodava DENTRO de `runInTransaction` pelo
 * POOL COMPARTILHADO — cada comando ja' segurava uma conexao e pedia uma
 * SEGUNDA, esgotando o pool com N ~ `pool.options.max`. A rodada 1 tentou
 * resolver com uma sonda tolerante ANTES da transacao, mas isso fez o REPLAY
 * tocar a identidade (e travar quando ela nao responde).
 *
 * A correcao desta rodada mantem a leitura DENTRO da transacao, porem na
 * conexao que a transacao JA' segura (`context.client`). O oraculo abaixo
 * instrumenta as duas fronteiras (port de identidade e unit-of-work) e prova:
 *
 *   - (c) toda leitura usa `options.transactionClient === context.client`;
 *         nenhuma chamada parte do pool compartilhado;
 *   - (a) replay com identidade indisponivel (ou pendurada) devolve o journal
 *         SEM chamar `exists` (contagem 0);
 *   - a precedencia: principal ausente falha fechado e um erro da identidade
 *         propaga sem ser engolido.
 *
 * O erro de PRODUCAO (a classe de `@anxionos/organizations` que o adapter real
 * lanca) e o status que o boundary devolve sao cobertos em
 * `tests/governance/principal-lookup-error-boundary.test.ts`: este arquivo vive
 * no projeto composite de `modules/governance`, cujo `rootDir`/`references`
 * proibe importar `@anxionos/organizations`.
 */

const SCOPE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_GRANT_ID = "22222222-2222-4222-8222-222222222222";
const GRANTEE_OWNER_ID = "33333333-3333-4333-8333-333333333333";
const CAPABILITY = "owner.manage";
const BASE_TIME = new Date("2026-09-12T00:00:00.000Z");
/**
 * Sentinela da conexao da transacao. `GovernanceTransactionContext.client` e'
 * `PoolClient`; o sentinela permite provar, por identidade, que a consulta
 * recebeu EXATAMENTE a conexao da transacao — e nao uma do pool.
 */
const TRANSACTION_CLIENT = { kind: "transaction-client" } as never;
const BREAK_GLASS_EXPIRES_AT = new Date(
	Date.now() + 60 * 60 * 1000,
).toISOString();
const DELEGATION_VALID_UNTIL = new Date(
	Date.now() + 60 * 60 * 1000,
).toISOString();

type LookupBehavior = "present" | "absent" | "unavailable" | "hang";

interface HarnessState {
	behavior: LookupBehavior;
	transactionOpen: boolean;
	transactionOpens: number;
	lookupCalls: number;
	lookupCallsOnTransactionClient: number;
	/** Leituras que pediriam uma SEGUNDA conexao do pool (o defeito). */
	lookupCallsFromPool: number;
	saves: number;
	principalIdCalls: string[];
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
		transactionOpen: false,
		transactionOpens: 0,
		lookupCalls: 0,
		lookupCallsOnTransactionClient: 0,
		lookupCallsFromPool: 0,
		saves: 0,
		principalIdCalls: [],
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
				// Mesma semantica do adapter PostgreSQL (ANX-476).
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
		client: TRANSACTION_CLIENT,
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
			state.transactionOpen = true;
			try {
				return await work(context);
			} finally {
				state.transactionOpen = false;
			}
		},
	};

	const principalLookup: PrincipalLookup = {
		async exists(principalId: string, options?: PrincipalLookupOptions) {
			state.lookupCalls += 1;
			state.principalIdCalls.push(principalId);
			if (options?.transactionClient === TRANSACTION_CLIENT) {
				state.lookupCallsOnTransactionClient += 1;
			} else {
				// O defeito: sem a conexao da transacao, a leitura pediria uma
				// SEGUNDA conexao do pool compartilhado.
				state.lookupCallsFromPool += 1;
			}
			if (state.behavior === "hang") {
				await new Promise(() => {});
			}
			if (state.behavior === "unavailable") {
				throw new Error("identity service unavailable");
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

describe("ANX-477 — a identidade e' lida na conexao da transacao, nunca no pool", () => {
	for (const commandCase of COMMAND_CASES) {
		test(`${commandCase.name}: exists roda 1x com transactionClient === context.client`, async () => {
			const harness = createHarness("present");
			commandCase.prepare(harness);
			await commandCase.invoke(harness.deps, randomUUID());
			expect(harness.state.lookupCalls).toBe(1);
			expect(harness.state.lookupCallsOnTransactionClient).toBe(1);
			// A prova direta do defeito: NENHUMA leitura pede o pool.
			expect(harness.state.lookupCallsFromPool).toBe(0);
			expect(harness.state.transactionOpens).toBe(1);
		});
	}
});

describe("ANX-477 — replay nao toca a identidade", () => {
	for (const commandCase of COMMAND_CASES) {
		test(`${commandCase.name}: identidade indisponivel devolve o journal sem chamar exists`, async () => {
			const harness = createHarness("present");
			commandCase.prepare(harness);
			const commandId = randomUUID();
			const aggregateId = commandCase.seedReplay(harness, commandId);
			harness.setLookupBehavior("unavailable");
			const result = await commandCase.invoke(harness.deps, commandId);
			expect(result.idempotentReplay).toBe(true);
			expect(result.aggregateId).toBe(aggregateId);
			// (a) contagem de chamadas == 0: o replay devolve o journal sem
			// consultar a identidade.
			expect(harness.state.lookupCalls).toBe(0);
			expect(harness.state.lookupCallsFromPool).toBe(0);
			expect(harness.state.saves).toBe(0);
		});

		test(`${commandCase.name}: identidade PENDURADA nao prende o replay`, async () => {
			const harness = createHarness("present");
			commandCase.prepare(harness);
			const commandId = randomUUID();
			const aggregateId = commandCase.seedReplay(harness, commandId);
			harness.setLookupBehavior("hang");
			const outcome = await Promise.race([
				commandCase.invoke(harness.deps, commandId),
				Bun.sleep(250).then(() => "pending" as const),
			]);
			expect(outcome).not.toBe("pending");
			expect((outcome as GovernanceCommandResult).idempotentReplay).toBe(true);
			expect((outcome as GovernanceCommandResult).aggregateId).toBe(
				aggregateId,
			);
			expect(harness.state.lookupCalls).toBe(0);
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
		const callsBeforeReplay = harness.state.lookupCalls;
		harness.setLookupBehavior("unavailable");
		const replay = await issueGrant(harness.deps, {
			commandId,
			scopeId: SCOPE_ID,
			issuedByPrincipalId: null,
			granteePrincipalId: PRINCIPAL_ID,
			capability: CAPABILITY,
		});
		expect(replay).toEqual({ ...issued, idempotentReplay: true });
		expect(harness.state.lookupCalls).toBe(callsBeforeReplay);
	});
});

describe("ANX-477 — comando NOVO ainda consulta a identidade", () => {
	for (const commandCase of COMMAND_CASES) {
		test(`${commandCase.name}: principal ausente falha fechado sem gravar`, async () => {
			const harness = createHarness("absent");
			commandCase.prepare(harness);
			const commandId = randomUUID();
			const pending = commandCase.invoke(harness.deps, commandId);
			await expect(pending).rejects.toBeInstanceOf(GovernanceCommandError);
			await expect(pending).rejects.toMatchObject({
				governanceCode: "GOV_PRINCIPAL_NOT_FOUND",
			});
			expect(harness.state.lookupCalls).toBe(1);
			expect(harness.state.lookupCallsFromPool).toBe(0);
			expect(harness.state.saves).toBe(0);
			expect(harness.journal.has(commandId)).toBe(false);
		});

		test(`${commandCase.name}: erro da identidade propaga sem ser engolido`, async () => {
			const harness = createHarness("unavailable");
			commandCase.prepare(harness);
			const commandId = randomUUID();
			await expect(commandCase.invoke(harness.deps, commandId)).rejects.toThrow(
				"identity service unavailable",
			);
			expect(harness.state.lookupCalls).toBe(1);
			expect(harness.state.lookupCallsFromPool).toBe(0);
			expect(harness.state.saves).toBe(0);
			expect(harness.journal.has(commandId)).toBe(false);
		});
	}
});
