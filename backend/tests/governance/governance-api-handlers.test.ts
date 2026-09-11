import { describe, expect, test } from "bun:test";
import { AppError } from "@anxionos/contracts/errors";
import {
	createGraphT01TraversalEvaluator,
	GOVERNANCE_T01_DENY_REASONS,
	GovernanceCommandError,
} from "@anxionos/governance";
import { handleAuthorizationCan } from "../../apps/api/src/governance/handlers/authorization-can";
import {
	handleListPendingChangeProposals,
	toChangeProposalDto,
} from "../../apps/api/src/governance/handlers/change-proposals";
import {
	handleIssueGrant,
	handleListGrants,
	handleRevokeGrant,
	toGrantDto,
} from "../../apps/api/src/governance/handlers/grants";
import type { ChangeProposal } from "../../modules/governance/src/domain/entities/change-proposal";
import type { Grant } from "../../modules/governance/src/domain/entities/grant";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
	createStubPrincipalLookup,
} from "./test-support";

const scopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "11111111-1111-4111-8111-111111111111";
const granteePrincipalId = "22222222-2222-4222-8222-222222222222";
const grantId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherAgencyId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const otherPrincipalId = "33333333-3333-4333-8333-333333333333";

function seedGrant(overrides: Partial<Grant> = {}): Grant {
	const now = new Date("2026-09-10T12:00:00.000Z");
	return {
		id: grantId,
		tenantId: scopeId,
		agencyId: scopeId,
		scopeId,
		scopeKind: "agency",
		granteePrincipalId: principalId,
		granteeAgentId: null,
		capability: "owner.read",
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: new Date("2027-09-10T12:00:00.000Z"),
		derivedFromMembershipId: null,
		issuedByPrincipalId: null,
		authorityEpochAtIssue: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

const proposalId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

function seedPendingProposal(
	overrides: Partial<ChangeProposal> = {},
): ChangeProposal {
	const now = new Date("2026-09-10T12:00:00.000Z");
	return {
		id: proposalId,
		tenantId: scopeId,
		agencyId: scopeId,
		scopeId,
		kind: "INSTITUTIONAL",
		payloadHash: "sha256:demo-payload",
		proposerPrincipalId: principalId,
		status: "pending",
		requiredApprovals: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function createGrantHandlerDeps() {
	const grantRepository = createInMemoryGrantRepository([seedGrant()]);
	const changeProposalRepository = createInMemoryChangeProposalRepository([
		seedPendingProposal(),
	]);
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		changeProposalRepository,
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	return {
		grantRepository,
		changeProposalRepository,
		commandJournal,
		unitOfWork,
		principalLookup: createStubPrincipalLookup([granteePrincipalId]),
	};
}

describe("governance API handlers (slice 6)", () => {
	test("handleListGrants returns DTOs for effective grants", async () => {
		const deps = createGrantHandlerDeps();
		const result = await handleListGrants(deps, {
			agencyId: scopeId,
			principalId,
		});
		expect(result.grants).toHaveLength(1);
		expect(result.grants[0]?.id).toBe(grantId);
	});

	test("handleIssueGrant issues grant for agency scope", async () => {
		const deps = createGrantHandlerDeps();
		// ANX-466: o emissor precisa deter a capability que concede. A baseline
		// de owner (CAP-B01) inclui `owner.manage`, entao um owner pode repassa-la.
		await deps.grantRepository.save(
			seedGrant({
				id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
				capability: "owner.manage",
			}),
		);
		const result = await handleIssueGrant(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			agencyId: scopeId,
			actor: { principalId, role: "owner" },
			body: {
				granteePrincipalId,
				capability: "owner.manage",
			},
		});
		expect(result.aggregateId).toBeTruthy();
	});

	/**
	 * ANX-466 — o exploit: `operator` da agencia emitia `identity.admin` para si
	 * e, com esse grant, revogava globalmente o owner. A politica de emissao
	 * declarada em contrato recusa a capability administrativa pelo papel.
	 */
	test("handleIssueGrant rejeita identity.admin emitida por operator", async () => {
		const deps = createGrantHandlerDeps();
		await expect(
			handleIssueGrant(deps, {
				commandId: "12121212-1212-4212-8212-121212121212",
				agencyId: scopeId,
				actor: { principalId: granteePrincipalId, role: "operator" },
				body: {
					granteePrincipalId,
					capability: "identity.admin",
				},
			}),
		).rejects.toMatchObject({ governanceCode: "GOV_INSUFFICIENT_AUTHORITY" });
		expect(
			await deps.grantRepository.listActiveByPrincipal(granteePrincipalId),
		).toHaveLength(0);
	});

	/**
	 * ANX-466 — sem auto-elevacao: mesmo owner/admin nao concede a si mesmo uma
	 * capability que ainda nao detem (aqui, `agents.publish` operacional).
	 */
	test("handleIssueGrant rejeita auto-concessao de capability nao detida", async () => {
		const deps = createGrantHandlerDeps();
		await expect(
			handleIssueGrant(deps, {
				commandId: "13131313-1313-4313-8313-131313131313",
				agencyId: scopeId,
				actor: { principalId, role: "admin" },
				body: {
					granteePrincipalId: principalId,
					capability: "agents.publish",
				},
			}),
		).rejects.toMatchObject({ governanceCode: "GOV_INSUFFICIENT_AUTHORITY" });
	});

	/**
	 * ANX-466 — capability administrativa so' circula por quem ja' a detem:
	 * evita lavar `identity.admin` pela mao de um admin/owner que nao a possui.
	 */
	test("handleIssueGrant rejeita repasse de identity.admin por quem nao a detem", async () => {
		const deps = createGrantHandlerDeps();
		await expect(
			handleIssueGrant(deps, {
				commandId: "14141414-1414-4414-8414-141414141414",
				agencyId: scopeId,
				actor: { principalId, role: "owner" },
				body: {
					granteePrincipalId,
					capability: "identity.admin",
				},
			}),
		).rejects.toMatchObject({ governanceCode: "GOV_INSUFFICIENT_AUTHORITY" });
	});

	/**
	 * G5 FURO 1: `owner.read` sozinho ja' confere autoridade de owner
	 * (`hasOwnerAuthority` aceita qualquer um de `owner.*`). Enquanto ficou fora
	 * da classe administrativa, um `operator` emitia `owner.read` a terceiro e o
	 * terceiro passava a aprovar proposta INSTITUTIONAL/HIERARCHY_MODE.
	 */
	test("handleIssueGrant rejeita owner.read emitida por operator a terceiro", async () => {
		const deps = createGrantHandlerDeps();
		await expect(
			handleIssueGrant(deps, {
				commandId: "16161616-1616-4616-8616-161616161616",
				agencyId: scopeId,
				actor: { principalId: granteePrincipalId, role: "operator" },
				body: {
					granteePrincipalId: otherPrincipalId,
					capability: "owner.read",
				},
			}),
		).rejects.toMatchObject({ governanceCode: "GOV_INSUFFICIENT_AUTHORITY" });
		expect(
			await deps.grantRepository.listActiveByPrincipal(otherPrincipalId),
		).toHaveLength(0);
	});

	/**
	 * G5 FURO 2: nem capability operacional de outro modulo pode ser concedida a
	 * terceiro sem posse — o fallback de `governance-guards` a torna efetiva.
	 */
	test("handleIssueGrant rejeita agents.skills.evaluate a terceiro sem posse", async () => {
		const deps = createGrantHandlerDeps();
		await expect(
			handleIssueGrant(deps, {
				commandId: "17171717-1717-4717-8717-171717171717",
				agencyId: scopeId,
				actor: { principalId: granteePrincipalId, role: "operator" },
				body: {
					granteePrincipalId: otherPrincipalId,
					capability: "agents.skills.evaluate",
				},
			}),
		).rejects.toMatchObject({ governanceCode: "GOV_INSUFFICIENT_AUTHORITY" });
	});

	/**
	 * G5 FURO 4: a existencia da capability e' checada antes da autoridade. Sem
	 * isso `identity.superadmin` (desconhecida, prefixo administrativo) sairia
	 * como 403 e vazaria a decisao de autoridade.
	 */
	test("handleIssueGrant rejeita capability desconhecida com prefixo administrativo como 400", async () => {
		const deps = createGrantHandlerDeps();
		await expect(
			handleIssueGrant(deps, {
				commandId: "18181818-1818-4818-8818-181818181818",
				agencyId: scopeId,
				actor: { principalId: granteePrincipalId, role: "operator" },
				body: {
					granteePrincipalId: otherPrincipalId,
					capability: "identity.superadmin",
				},
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_CAPABILITY_UNKNOWN",
			statusCode: 400,
		});
	});

	test("handleIssueGrant rejeita capability fora do catalogo com 400", async () => {
		const deps = createGrantHandlerDeps();
		await expect(
			handleIssueGrant(deps, {
				commandId: "15151515-1515-4515-8515-151515151515",
				agencyId: scopeId,
				actor: { principalId, role: "owner" },
				body: {
					granteePrincipalId,
					capability: "totally.unknown.capability",
				},
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_CAPABILITY_UNKNOWN",
			statusCode: 400,
		});
	});

	test("handleRevokeGrant revokes grant by id", async () => {
		const deps = createGrantHandlerDeps();
		const result = await handleRevokeGrant(deps, {
			commandId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
			agencyId: scopeId,
			grantId,
			actor: { principalId, role: "owner" },
			body: { reason: "test revoke" },
		});
		expect(result.revision).toBeGreaterThan(0);
	});

	test("handleRevokeGrant rejects grant outside agency scope", async () => {
		const deps = createGrantHandlerDeps();
		await expect(
			handleRevokeGrant(deps, {
				commandId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
				agencyId: otherAgencyId,
				grantId,
				actor: { principalId, role: "owner" },
				body: {},
			}),
		).rejects.toBeInstanceOf(GovernanceCommandError);
	});

	/**
	 * ANX-469 — o achado: a rota reusava a guarda de papel da emissao
	 * (`owner|admin|operator`) e nao limitava o alvo, entao um `operator`
	 * revogava grants do `owner` da propria agencia. O catalogo
	 * (`governance.grant.revoke`) exige owner/issuer.
	 */
	test("handleRevokeGrant nega operator revogando grant do owner", async () => {
		const deps = createGrantHandlerDeps();
		await expect(
			handleRevokeGrant(deps, {
				commandId: "1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a",
				agencyId: scopeId,
				grantId,
				actor: { principalId: otherPrincipalId, role: "operator" },
				body: {},
			}),
		).rejects.toMatchObject({ governanceCode: "GOV_INSUFFICIENT_AUTHORITY" });
		const stored = await deps.grantRepository.findById(grantId);
		expect(stored?.status).toBe("active");
	});

	test("handleRevokeGrant permite ao emissor revogar o proprio grant operacional", async () => {
		const deps = createGrantHandlerDeps();
		const issuedGrant = seedGrant({
			id: "1b1b1b1b-1b1b-4b1b-8b1b-1b1b1b1b1b1b",
			granteePrincipalId: otherPrincipalId,
			capability: "agents.publish",
			issuedByPrincipalId: principalId,
		});
		await deps.grantRepository.save(issuedGrant);
		const result = await handleRevokeGrant(deps, {
			commandId: "1c1c1c1c-1c1c-4c1c-8c1c-1c1c1c1c1c1c",
			agencyId: scopeId,
			grantId: issuedGrant.id,
			actor: { principalId, role: "operator" },
			body: {},
		});
		expect(result.aggregateId).toBe(issuedGrant.id);
		expect((await deps.grantRepository.findById(issuedGrant.id))?.status).toBe(
			"revoked",
		);
	});

	/**
	 * ANX-469 — o caminho de emissor nao amplia a classe: `operator` nao revoga
	 * grant administrativo mesmo tendo sido o emissor registrado (estado legado
	 * possivel antes do ANX-466).
	 */
	test("handleRevokeGrant nega operator emissor de grant administrativo", async () => {
		const deps = createGrantHandlerDeps();
		const adminGrant = seedGrant({
			id: "1d1d1d1d-1d1d-4d1d-8d1d-1d1d1d1d1d1d",
			granteePrincipalId: otherPrincipalId,
			capability: "identity.admin",
			issuedByPrincipalId: principalId,
		});
		await deps.grantRepository.save(adminGrant);
		await expect(
			handleRevokeGrant(deps, {
				commandId: "1e1e1e1e-1e1e-4e1e-8e1e-1e1e1e1e1e1e",
				agencyId: scopeId,
				grantId: adminGrant.id,
				actor: { principalId, role: "operator" },
				body: {},
			}),
		).rejects.toMatchObject({ governanceCode: "GOV_INSUFFICIENT_AUTHORITY" });
		expect((await deps.grantRepository.findById(adminGrant.id))?.status).toBe(
			"active",
		);
	});

	test("handleRevokeGrant permite owner revogar grant de terceiro", async () => {
		const deps = createGrantHandlerDeps();
		const thirdPartyGrant = seedGrant({
			id: "1f1f1f1f-1f1f-4f1f-8f1f-1f1f1f1f1f1f",
			granteePrincipalId: otherPrincipalId,
			capability: "agents.publish",
			issuedByPrincipalId: otherPrincipalId,
		});
		await deps.grantRepository.save(thirdPartyGrant);
		const result = await handleRevokeGrant(deps, {
			commandId: "2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a",
			agencyId: scopeId,
			grantId: thirdPartyGrant.id,
			actor: { principalId, role: "owner" },
			body: {},
		});
		expect(result.aggregateId).toBe(thirdPartyGrant.id);
		expect(
			(await deps.grantRepository.findById(thirdPartyGrant.id))?.status,
		).toBe("revoked");
	});

	test("handleAuthorizationCan rejects actorId mismatch", async () => {
		const traversalEvaluator = createGraphT01TraversalEvaluator({
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			graphEvaluator: {
				async evaluate() {
					return { decision: "ALLOW" as const };
				},
			},
		});
		await expect(
			handleAuthorizationCan({ traversalEvaluator } as never, {
				principalId,
				body: {
					agencyId: scopeId,
					actorId: otherPrincipalId,
					action: "trade.execute",
					resourceNodeKey: {
						scopeType: "AGENCY",
						scopeId,
						type: "account",
						id: scopeId,
					},
					validAt: new Date().toISOString(),
				},
			}),
		).rejects.toBeInstanceOf(AppError);
	});

	test("toGrantDto serializes ISO timestamps", () => {
		const dto = toGrantDto(seedGrant());
		expect(dto.validFrom).toMatch(/2026-09-10/);
	});

	test("handleAuthorizationCan fail-closed when graph unavailable", async () => {
		const traversalEvaluator = createGraphT01TraversalEvaluator({
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			graphEvaluator: {
				async evaluate() {
					throw new Error("down");
				},
			},
		});
		const result = await handleAuthorizationCan(
			{ traversalEvaluator } as never,
			{
				principalId,
				body: {
					agencyId: scopeId,
					actorId: principalId,
					action: "trade.execute",
					resourceNodeKey: {
						scopeType: "AGENCY",
						scopeId,
						type: "account",
						id: scopeId,
					},
					validAt: new Date().toISOString(),
				},
			},
		);
		expect(result.decision).toBe("DENY");
		expect(result.denyReasons).toContain(
			GOVERNANCE_T01_DENY_REASONS.GRAPH_UNAVAILABLE,
		);
	});
	test("handleListPendingChangeProposals returns pending DTOs for agency scope", async () => {
		const deps = createGrantHandlerDeps();
		const result = await handleListPendingChangeProposals(deps, {
			agencyId: scopeId,
		});
		expect(result.changeProposals).toHaveLength(1);
		expect(result.changeProposals[0]?.id).toBe(proposalId);
		expect(result.changeProposals[0]?.status).toBe("pending");
	});

	test("handleListPendingChangeProposals returns empty when none pending", async () => {
		const deps = createGrantHandlerDeps();
		const result = await handleListPendingChangeProposals(deps, {
			agencyId: otherAgencyId,
		});
		expect(result.changeProposals).toHaveLength(0);
	});

	test("toChangeProposalDto serializes ISO timestamps", () => {
		const dto = toChangeProposalDto(seedPendingProposal());
		expect(dto.createdAt).toMatch(/2026-09-10/);
		expect(dto.kind).toBe("INSTITUTIONAL");
	});
});
