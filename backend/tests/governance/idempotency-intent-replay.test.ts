import { describe, expect, test } from "bun:test";
import {
	activateBreakGlass,
	assignAutonomyLevel,
	createDelegation,
	type Grant,
	issueMandate,
	transitionAutonomyLevel,
} from "@anxionos/governance";
import { GovernanceCommandError } from "../../modules/governance/src/application/errors";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryAutonomyAssignmentRepository,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryDelegationRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
	createStubPrincipalLookup,
} from "./test-support";

/**
 * ANX-476 — correcao dos achados A/B/D do G2 no digest `f9f9f70b`.
 *
 * B (MEDIUM, regressao): a idempotencia existe para o retry ser seguro DEPOIS
 * que o mundo mudou. Os testes de replay anteriores so' cobriam estado
 * inalterado; estes revogam o parent / deixam a janela vencer entre a primeira
 * chamada e o retry, e exigem REPLAY (mesmo `aggregateId`), nao erro.
 *
 * A (MEDIUM): reusar a key com a intencao divergente (`evidenceHash`,
 * `approvalId`, `transitionKind`, `actorPrincipalId`, `reason`) tem de ser 409
 * `GOV_DUPLICATE_IDEMPOTENCY` e escrever zero.
 *
 * D (LOW): o mesmo `capabilitySubset` em ordem diferente e' a MESMA intencao —
 * replay, nao 409.
 */

const scopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const parentGrantId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ownerPrincipalId = "11111111-1111-4111-8111-111111111111";
const delegatePrincipalId = "22222222-2222-4222-8222-222222222222";
const subjectAgentId = "33333333-3333-4333-8333-333333333333";
const HOUR_MS = 60 * 60 * 1000;
const delegationValidUntil = new Date(Date.now() + 24 * HOUR_MS).toISOString();

function seedGrant(capability = "owner.*"): Grant {
	const now = new Date();
	return {
		id: parentGrantId,
		tenantId: scopeId,
		agencyId: scopeId,
		scopeId,
		scopeKind: "agency",
		granteePrincipalId: ownerPrincipalId,
		granteeAgentId: null,
		capability,
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: new Date(now.getTime() + 24 * HOUR_MS),
		derivedFromMembershipId: null,
		issuedByPrincipalId: null,
		authorityEpochAtIssue: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

function createHarness(grant: Grant = seedGrant()) {
	const grantRepository = createInMemoryGrantRepository([grant]);
	const delegationRepository = createInMemoryDelegationRepository();
	const autonomyAssignmentRepository =
		createInMemoryAutonomyAssignmentRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		delegationRepository,
		autonomyAssignmentRepository,
		changeProposalRepository: createInMemoryChangeProposalRepository(),
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	return {
		unitOfWork,
		commandJournal,
		grantRepository,
		delegationRepository,
		autonomyAssignmentRepository,
		published,
		principalLookup: createStubPrincipalLookup([
			ownerPrincipalId,
			delegatePrincipalId,
		]),
	};
}

async function revokeSeedGrant(
	grantRepository: ReturnType<typeof createInMemoryGrantRepository>,
): Promise<void> {
	const parent = await grantRepository.findById(parentGrantId);
	if (!parent) {
		throw new Error("test fixture: parent grant missing");
	}
	await grantRepository.save({
		...parent,
		status: "revoked",
		revision: parent.revision + 1,
		updatedAt: new Date(),
	});
}

describe("ANX-476/B — retry legitimo apos o mundo mudar", () => {
	test("CreateDelegation replaya mesmo com o parent grant revogado", async () => {
		const harness = createHarness();
		const deps = {
			unitOfWork: harness.unitOfWork,
			commandJournal: harness.commandJournal,
			grantRepository: harness.grantRepository,
			principalLookup: harness.principalLookup,
		};
		const commandId = "aaaa1111-1111-4111-8111-111111111111";
		const input = {
			commandId,
			parentGrantId,
			delegatePrincipalId,
			capabilitySubset: ["owner.read"],
			validUntil: delegationValidUntil,
		};
		const first = await createDelegation(deps, input);
		const writesAfterFirst = harness.published.length;
		expect(writesAfterFirst).toBeGreaterThan(0);

		await revokeSeedGrant(harness.grantRepository);

		const replay = await createDelegation(deps, input);

		expect(replay).toEqual({ ...first, idempotentReplay: true });
		expect(replay.aggregateId).toBe(first.aggregateId);
		expect(harness.published).toHaveLength(writesAfterFirst);
		expect(
			await harness.grantRepository.listEffective(scopeId, delegatePrincipalId),
		).toHaveLength(1);
	});

	test("IssueMandate replaya mesmo com o backing grant revogado", async () => {
		const harness = createHarness();
		const deps = {
			unitOfWork: harness.unitOfWork,
			commandJournal: harness.commandJournal,
			grantRepository: harness.grantRepository,
		};
		const commandId = "bbbb1111-1111-4111-8111-111111111111";
		const input = {
			commandId,
			grantId: parentGrantId,
			agentId: subjectAgentId,
			mandateKind: "operator" as const,
		};
		const first = await issueMandate(deps, input);
		const writesAfterFirst = harness.published.length;

		await revokeSeedGrant(harness.grantRepository);

		const replay = await issueMandate(deps, input);

		expect(replay).toEqual({ ...first, idempotentReplay: true });
		expect(replay.aggregateId).toBe(first.aggregateId);
		expect(harness.published).toHaveLength(writesAfterFirst);
	});

	test("ActivateBreakGlass replaya mesmo depois do expiresAt vencer", async () => {
		let now = new Date();
		const expiresAt = new Date(now.getTime() + HOUR_MS).toISOString();
		const harness = createHarness();
		const deps = {
			unitOfWork: harness.unitOfWork,
			commandJournal: harness.commandJournal,
			principalLookup: harness.principalLookup,
			now: () => now,
		};
		const commandId = "cccc1111-1111-4111-8111-111111111111";
		const input = {
			commandId,
			scopeId,
			granteePrincipalId: delegatePrincipalId,
			capability: "owner.manage",
			reason: "incident INC-B",
			expiresAt,
			incidentRef: "INC-B",
		};
		const first = await activateBreakGlass(deps, input);
		const writesAfterFirst = harness.published.length;

		// O mundo mudou: a janela venceu. O retry tem de reproduzir o
		// resultado — antes deste passe ele falhava com
		// `GOV_INSUFFICIENT_AUTHORITY`.
		now = new Date(new Date(expiresAt).getTime() + 1);
		const replay = await activateBreakGlass(deps, input);

		expect(replay).toEqual({ ...first, idempotentReplay: true });
		expect(replay.aggregateId).toBe(first.aggregateId);
		expect(harness.published).toHaveLength(writesAfterFirst);
	});

	test("execucao NOVA depois do expiresAt vencer continua recusada", async () => {
		const now = new Date();
		const harness = createHarness();
		await expect(
			activateBreakGlass(
				{
					unitOfWork: harness.unitOfWork,
					commandJournal: harness.commandJournal,
					principalLookup: harness.principalLookup,
					now: () => now,
				},
				{
					commandId: "cccc2222-2222-4222-8222-222222222222",
					scopeId,
					granteePrincipalId: delegatePrincipalId,
					capability: "owner.manage",
					reason: "incident INC-C",
					expiresAt: new Date(now.getTime() - 1).toISOString(),
					incidentRef: "INC-C",
				},
			),
		).rejects.toMatchObject({
			governanceCode: "GOV_INSUFFICIENT_AUTHORITY",
		} satisfies Partial<GovernanceCommandError>);
		expect(harness.published).toHaveLength(0);
	});
});

describe("ANX-476/A — reuso divergente da key e' 409 com zero escrita", () => {
	test("AssignAutonomyLevel recusa evidenceHash divergente", async () => {
		const harness = createHarness();
		const deps = {
			unitOfWork: harness.unitOfWork,
			commandJournal: harness.commandJournal,
		};
		const commandId = "dddd1111-1111-4111-8111-111111111111";
		const first = await assignAutonomyLevel(deps, {
			commandId,
			scopeId,
			subjectAgentId,
			level: "L0",
			evidenceHash: "evidence-a",
		});
		const writesAfterFirst = harness.published.length;

		await expect(
			assignAutonomyLevel(deps, {
				commandId,
				scopeId,
				subjectAgentId,
				level: "L0",
				evidenceHash: "evidence-b",
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		} satisfies Partial<GovernanceCommandError>);

		const stored = await harness.autonomyAssignmentRepository.findById(
			first.aggregateId,
		);
		expect(stored?.evidenceHash).toBe("evidence-a");
		expect(harness.published).toHaveLength(writesAfterFirst);
	});

	test("AssignAutonomyLevel recusa approvalId divergente", async () => {
		const harness = createHarness();
		const deps = {
			unitOfWork: harness.unitOfWork,
			commandJournal: harness.commandJournal,
		};
		const commandId = "dddd2222-2222-4222-8222-222222222222";
		const first = await assignAutonomyLevel(deps, {
			commandId,
			scopeId,
			subjectAgentId,
			level: "L0",
			approvalId: "99999999-9999-4999-8999-999999999991",
		});
		const writesAfterFirst = harness.published.length;

		await expect(
			assignAutonomyLevel(deps, {
				commandId,
				scopeId,
				subjectAgentId,
				level: "L0",
				approvalId: "99999999-9999-4999-8999-999999999992",
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		} satisfies Partial<GovernanceCommandError>);

		expect(
			(await harness.autonomyAssignmentRepository.findById(first.aggregateId))
				?.approvalId,
		).toBe("99999999-9999-4999-8999-999999999991");
		expect(harness.published).toHaveLength(writesAfterFirst);
	});

	test("TransitionAutonomyLevel recusa transitionKind divergente", async () => {
		const harness = createHarness();
		const deps = {
			unitOfWork: harness.unitOfWork,
			commandJournal: harness.commandJournal,
		};
		const commandId = "eeee1111-1111-4111-8111-111111111111";
		const first = await transitionAutonomyLevel(deps, {
			commandId,
			scopeId,
			subjectAgentId,
			targetLevel: "L0",
			transitionKind: "takeover",
			actorPrincipalId: ownerPrincipalId,
			reason: "reason-a",
		});
		const writesAfterFirst = harness.published.length;

		await expect(
			transitionAutonomyLevel(deps, {
				commandId,
				scopeId,
				subjectAgentId,
				targetLevel: "L0",
				// Mantem todo o resto igual; so' o `transitionKind` diverge. Ele
				// NAO e' persistido no assignment — sem o `requestHash` este
				// reuso devolvia 200 `idempotentReplay`.
				transitionKind: "promote",
				actorPrincipalId: ownerPrincipalId,
				reason: "reason-a",
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		} satisfies Partial<GovernanceCommandError>);

		expect(harness.published).toHaveLength(writesAfterFirst);
		expect(
			(await harness.autonomyAssignmentRepository.findById(first.aggregateId))
				?.level,
		).toBe("L0");
	});

	test.each([
		["evidenceHash", { evidenceHash: "evidence-b" }],
		["actorPrincipalId", { actorPrincipalId: delegatePrincipalId }],
		["reason", { reason: "reason-b" }],
	])(
		"TransitionAutonomyLevel recusa %s divergente",
		async (_field, divergence) => {
			const harness = createHarness();
			const deps = {
				unitOfWork: harness.unitOfWork,
				commandJournal: harness.commandJournal,
			};
			const commandId = "eeee2222-2222-4222-8222-222222222222";
			await transitionAutonomyLevel(deps, {
				commandId,
				scopeId,
				subjectAgentId,
				targetLevel: "L0",
				transitionKind: "takeover",
				actorPrincipalId: ownerPrincipalId,
				reason: "reason-a",
				evidenceHash: "evidence-a",
			});
			const writesAfterFirst = harness.published.length;

			await expect(
				transitionAutonomyLevel(deps, {
					commandId,
					scopeId,
					subjectAgentId,
					targetLevel: "L0",
					transitionKind: "takeover",
					actorPrincipalId: ownerPrincipalId,
					reason: "reason-a",
					evidenceHash: "evidence-a",
					...divergence,
				}),
			).rejects.toMatchObject({
				governanceCode: "GOV_DUPLICATE_IDEMPOTENCY",
				statusCode: 409,
			} satisfies Partial<GovernanceCommandError>);

			expect(harness.published).toHaveLength(writesAfterFirst);
		},
	);
});

describe("ANX-476/D — intencao de CreateDelegation insensivel a ordem", () => {
	test("mesmo capabilitySubset em ordem diferente e' replay, nao 409", async () => {
		const harness = createHarness();
		const deps = {
			unitOfWork: harness.unitOfWork,
			commandJournal: harness.commandJournal,
			grantRepository: harness.grantRepository,
			principalLookup: harness.principalLookup,
		};
		const commandId = "ffff1111-1111-4111-8111-111111111111";
		const first = await createDelegation(deps, {
			commandId,
			parentGrantId,
			delegatePrincipalId,
			capabilitySubset: ["owner.read", "owner.manage"],
			validUntil: delegationValidUntil,
		});
		const writesAfterFirst = harness.published.length;

		const replay = await createDelegation(deps, {
			commandId,
			parentGrantId,
			delegatePrincipalId,
			capabilitySubset: ["owner.manage", "owner.read"],
			validUntil: delegationValidUntil,
		});

		expect(replay).toEqual({ ...first, idempotentReplay: true });
		expect(harness.published).toHaveLength(writesAfterFirst);
		expect(
			await harness.grantRepository.listEffective(scopeId, delegatePrincipalId),
		).toHaveLength(2);
	});

	test("intentHash divergente e' 409 (faz parte do payload)", async () => {
		const harness = createHarness();
		const deps = {
			unitOfWork: harness.unitOfWork,
			commandJournal: harness.commandJournal,
			grantRepository: harness.grantRepository,
			principalLookup: harness.principalLookup,
		};
		const commandId = "ffff2222-2222-4222-8222-222222222222";
		await createDelegation(deps, {
			commandId,
			parentGrantId,
			delegatePrincipalId,
			capabilitySubset: ["owner.read"],
			validUntil: delegationValidUntil,
			intentHash: "intent-a",
		});
		const writesAfterFirst = harness.published.length;

		await expect(
			createDelegation(deps, {
				commandId,
				parentGrantId,
				delegatePrincipalId,
				capabilitySubset: ["owner.read"],
				validUntil: delegationValidUntil,
				intentHash: "intent-b",
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		} satisfies Partial<GovernanceCommandError>);
		expect(harness.published).toHaveLength(writesAfterFirst);
	});

	/**
	 * ANX-476/F1 (LOW/MEDIUM do G5): o `reason` vai para o EVENTO (auditoria),
	 * nao existe no grant, e ficava FORA da intencao — reusar a key com motivo
	 * divergente devolvia 200 replay mantendo o motivo antigo. Fechado com o
	 * `requestHash` gravado junto da intencao.
	 */
	test("ActivateBreakGlass recusa reuso da key com motivo divergente", async () => {
		// A janela do break-glass e' limitada a 24h: calcula uma janela futura
		// relativa ao clock local do teste, sem alterar o relogio global do processo.
		const now = new Date();
		const expiresAt = new Date(now.getTime() + HOUR_MS).toISOString();
		const harness = createHarness();
		const deps = {
			unitOfWork: harness.unitOfWork,
			commandJournal: harness.commandJournal,
			principalLookup: harness.principalLookup,
			now: () => now,
		};
		const commandId = "cccc2222-2222-4222-8222-222222222222";
		const input = {
			commandId,
			scopeId,
			granteePrincipalId: delegatePrincipalId,
			capability: "owner.manage",
			reason: "incident INC-C",
			expiresAt,
			incidentRef: "INC-C",
		};
		await activateBreakGlass(deps, input);
		const writesAfterFirst = harness.published.length;

		await expect(
			activateBreakGlass(deps, { ...input, reason: "incident OUTRO" }),
		).rejects.toMatchObject({
			governanceCode: "GOV_DUPLICATE_IDEMPOTENCY",
		});
		// Nada novo foi publicado: o reuso divergente nao aplica efeito.
		expect(harness.published.length).toBe(writesAfterFirst);
	});
});
