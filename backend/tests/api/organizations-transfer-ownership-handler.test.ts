import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { OrganizationCommandError } from "@anxionos/organizations";
import { handleTransferOwnership } from "../../apps/api/src/organizations/handlers/agencies";
import type { OrganizationsPluginDeps } from "../../apps/api/src/organizations/plugin";
import type { Agency } from "../../modules/organizations/src/domain/entities/agency";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import {
	createInMemoryAgencyRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryMembershipRepository,
	createInMemoryOwnerRepository,
	createRecordingOrganizationUnitOfWork,
	createStubPrincipalLookup,
} from "../organizations/test-support";

/**
 * Rota `POST /v1/organizations/agencies/:agencyId/ownership/transfer` — exposta
 * por decisao de escopo do dono (a superficie antes era orfa: comando e evento
 * existiam, nenhuma rota os alcancava). Cobre o wiring handler -> command, a
 * validacao de body e a rejeicao de ator que nao e' o owner ativo.
 */
const now = new Date("2026-09-11T12:00:00.000Z");
const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_PRINCIPAL = "22222222-2222-4222-8222-222222222222";
const SUCCESSOR_PRINCIPAL = "33333333-3333-4333-8333-333333333333";
const OUTSIDER_PRINCIPAL = "44444444-4444-4444-8444-444444444444";
const PRINCIPAL_WITHOUT_MEMBERSHIP = "55555555-5555-4555-8555-555555555556";

function buildAgency(ownerPrincipalId = OWNER_PRINCIPAL): Agency {
	return {
		id: AGENCY_ID,
		ownerPrincipalId,
		displayName: "Acme Capital",
		marketScope: "both",
		status: "ready",
		onboardingStep: "ready",
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

function buildMembership(
	id: string,
	principalId: string,
	role: Membership["role"],
	status: Membership["status"] = "active",
): Membership {
	return {
		id,
		agencyId: AGENCY_ID,
		principalId,
		inviteEmail: null,
		inviteTokenHash: null,
		inviteExpiresAt: null,
		role,
		status,
		invitedAt: null,
		joinedAt: now,
		revokedAt: null,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

function buildDeps(input: { ownerPrincipalId?: string } = {}) {
	const agencyRepository = createInMemoryAgencyRepository([
		buildAgency(input.ownerPrincipalId),
	]);
	const membershipRepository = createInMemoryMembershipRepository([
		buildMembership(
			"55555555-5555-4555-8555-555555555555",
			OWNER_PRINCIPAL,
			"owner",
		),
		buildMembership(
			"66666666-6666-4666-8666-666666666666",
			SUCCESSOR_PRINCIPAL,
			"admin",
		),
	]);
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingOrganizationUnitOfWork({
		agencyRepository,
		ownerRepository: createInMemoryOwnerRepository(),
		membershipRepository,
		commandJournal,
	});
	const deps = {
		unitOfWork,
		commandJournal,
		principalLookup: createStubPrincipalLookup([
			OWNER_PRINCIPAL,
			SUCCESSOR_PRINCIPAL,
			PRINCIPAL_WITHOUT_MEMBERSHIP,
		]),
	} as unknown as OrganizationsPluginDeps;
	return { deps, agencyRepository, membershipRepository, published };
}

async function captureError(work: () => Promise<unknown>): Promise<unknown> {
	try {
		await work();
		return undefined;
	} catch (error) {
		return error;
	}
}

describe("handleTransferOwnership", () => {
	test("transfere a posse ao sucessor ativo e publica ownership.transferred.v1", async () => {
		const { deps, agencyRepository, published } = buildDeps();

		const result = await handleTransferOwnership(deps, {
			commandId: randomUUID(),
			agencyId: AGENCY_ID,
			principalId: OWNER_PRINCIPAL,
			body: { newOwnerPrincipalId: SUCCESSOR_PRINCIPAL },
		});

		expect(result.aggregateId).toBe(AGENCY_ID);
		expect(result.revision).toBe(2);
		const agency = await agencyRepository.findByAgencyId(AGENCY_ID);
		expect(agency?.ownerPrincipalId).toBe(SUCCESSOR_PRINCIPAL);
		expect(
			published.some(
				(event) =>
					event.eventType === "organizations.agency.ownership_transferred.v1",
			),
		).toBe(true);
	});

	test("ator que nao e' o owner ativo e' rejeitado com ORG_CROSS_TENANT", async () => {
		const { deps, agencyRepository } = buildDeps();

		const error = await captureError(() =>
			handleTransferOwnership(deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: OUTSIDER_PRINCIPAL,
				body: { newOwnerPrincipalId: SUCCESSOR_PRINCIPAL },
			}),
		);

		expect(error).toBeInstanceOf(OrganizationCommandError);
		expect((error as OrganizationCommandError).organizationCode).toBe(
			"ORG_CROSS_TENANT",
		);
		// Nada mudou.
		const agency = await agencyRepository.findByAgencyId(AGENCY_ID);
		expect(agency?.ownerPrincipalId).toBe(OWNER_PRINCIPAL);
		expect(agency?.revision).toBe(1);
	});

	test("owner que nao e' o dono registrado na agency e' rejeitado", async () => {
		// Membership de owner ativo, mas a Agency aponta para outro principal:
		// o comando exige as duas condicoes.
		const { deps } = buildDeps({ ownerPrincipalId: OUTSIDER_PRINCIPAL });

		const error = await captureError(() =>
			handleTransferOwnership(deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: OWNER_PRINCIPAL,
				body: { newOwnerPrincipalId: SUCCESSOR_PRINCIPAL },
			}),
		);

		expect((error as OrganizationCommandError).organizationCode).toBe(
			"ORG_CROSS_TENANT",
		);
	});

	test("body sem newOwnerPrincipalId e' rejeitado (Zod strict)", async () => {
		const { deps } = buildDeps();
		await expect(
			handleTransferOwnership(deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: OWNER_PRINCIPAL,
				body: {},
			}),
		).rejects.toThrow();
	});

	test("body com propriedade extra e' rejeitado (Zod strict)", async () => {
		const { deps } = buildDeps();
		await expect(
			handleTransferOwnership(deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: OWNER_PRINCIPAL,
				body: {
					newOwnerPrincipalId: SUCCESSOR_PRINCIPAL,
					principalId: OUTSIDER_PRINCIPAL,
				},
			}),
		).rejects.toThrow();
	});

	test("newOwnerPrincipalId que nao e' UUID institucional e' rejeitado", async () => {
		const { deps } = buildDeps();
		await expect(
			handleTransferOwnership(deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: OWNER_PRINCIPAL,
				body: { newOwnerPrincipalId: "not-a-uuid" },
			}),
		).rejects.toThrow();
	});

	test("sucessor sem membership ativa e' rejeitado com ORG_OWNER_REQUIRED", async () => {
		// Principal existe, mas nao tem membership ativa na agency: a posse nao
		// pode ir para quem nao esta no quadro.
		const { deps } = buildDeps();
		const error = await captureError(() =>
			handleTransferOwnership(deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: OWNER_PRINCIPAL,
				body: { newOwnerPrincipalId: PRINCIPAL_WITHOUT_MEMBERSHIP },
			}),
		);
		expect((error as OrganizationCommandError).organizationCode).toBe(
			"ORG_OWNER_REQUIRED",
		);
	});

	test("sucessor inexistente responde o MESMO codigo que sucessor sem membership (sem oraculo)", async () => {
		// G5-F1/G4-F1: antes, principal inexistente devolvia 404
		// `ORG_PRINCIPAL_NOT_FOUND` e principal existente sem membership devolvia
		// 409 `ORG_OWNER_REQUIRED` — a diferenca enumerava a existencia de
		// principal na plataforma inteira, porque `identity_principals` nao tem
		// RLS e `newOwnerPrincipalId` e' do cliente. Os dois casos agora colapsam
		// no mesmo codigo e na mesma mensagem.
		const { deps } = buildDeps();
		const missingPrincipal = await captureError(() =>
			handleTransferOwnership(deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: OWNER_PRINCIPAL,
				body: { newOwnerPrincipalId: OUTSIDER_PRINCIPAL },
			}),
		);
		const withoutMembership = await captureError(() =>
			handleTransferOwnership(deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: OWNER_PRINCIPAL,
				body: { newOwnerPrincipalId: PRINCIPAL_WITHOUT_MEMBERSHIP },
			}),
		);

		const missing = missingPrincipal as OrganizationCommandError;
		const noMembership = withoutMembership as OrganizationCommandError;
		expect(missing.organizationCode).toBe("ORG_OWNER_REQUIRED");
		expect(noMembership.organizationCode).toBe("ORG_OWNER_REQUIRED");
		expect(missing.statusCode).toBe(noMembership.statusCode);
		expect(missing.message).toBe(noMembership.message);
	});

	test("ator que nao e' o owner NAO revela se o sucessor existe (sem oraculo)", async () => {
		// A autoridade e' checada ANTES de qualquer consulta ao alvo, entao um
		// nao-owner recebe a mesma resposta para sucessor existente e inexistente.
		const { deps } = buildDeps();
		const existingTarget = await captureError(() =>
			handleTransferOwnership(deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: OUTSIDER_PRINCIPAL,
				body: { newOwnerPrincipalId: PRINCIPAL_WITHOUT_MEMBERSHIP },
			}),
		);
		const missingTarget = await captureError(() =>
			handleTransferOwnership(deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: OUTSIDER_PRINCIPAL,
				body: { newOwnerPrincipalId: OUTSIDER_PRINCIPAL },
			}),
		);
		for (const error of [existingTarget, missingTarget]) {
			expect((error as OrganizationCommandError).organizationCode).toBe(
				"ORG_CROSS_TENANT",
			);
			expect((error as OrganizationCommandError).statusCode).toBe(403);
		}
	});
});
