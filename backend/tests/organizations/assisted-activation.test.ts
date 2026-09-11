import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { activateMembership } from "@anxionos/organizations";
import { OrganizationCommandError } from "../../modules/organizations/src/application/errors";
import type { Agency } from "../../modules/organizations/src/domain/entities/agency";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import {
	createInMemoryAgencyRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryMembershipRepository,
	createInMemoryOwnerRepository,
	createRecordingOrganizationUnitOfWork,
	createStubPrincipalLookup,
} from "./test-support";

/**
 * D-ORG-046 (ANX-460) — ativacao assistida.
 *
 * A decisao do dono restaurou `revoked -> active` para permitir REATIVACAO de quem
 * ja' consentiu. Isso abriu um caminho que nao existia antes: a membership
 * reativada mantem o `role` original, e o governance reemite a baseline de OWNER
 * em `membership.activated` quando o role e' owner. Como o convite nunca aceita
 * `role=owner`, um admin nao pode criar owner — mas poderia restaurar um owner
 * revogado. A guarda fecha isso: restaurar autoridade de owner e' ato de owner.
 */
const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_PRINCIPAL = "22222222-2222-4222-8222-222222222222";
const ADMIN_PRINCIPAL = "33333333-3333-4333-8333-333333333333";
const EX_OWNER_PRINCIPAL = "44444444-4444-4444-8444-444444444444";
const OWNER_MEMBERSHIP = "55555555-5555-4555-8555-555555555551";
const ADMIN_MEMBERSHIP = "55555555-5555-4555-8555-555555555552";
const REVOKED_OWNER_MEMBERSHIP = "55555555-5555-4555-8555-555555555553";
const REVOKED_ADMIN_MEMBERSHIP = "55555555-5555-4555-8555-555555555554";

const NOW = new Date("2026-09-11T12:00:00.000Z");

function buildAgency(): Agency {
	return {
		id: AGENCY_ID,
		ownerPrincipalId: OWNER_PRINCIPAL,
		displayName: "Acme Capital",
		marketScope: "both",
		status: "ready",
		onboardingStep: "ready",
		revision: 1,
		createdAt: NOW,
		updatedAt: NOW,
	};
}

function buildMembership(
	id: string,
	principalId: string | null,
	role: Membership["role"],
	status: Membership["status"],
	inviteEmail: string | null = null,
): Membership {
	return {
		id,
		agencyId: AGENCY_ID,
		principalId,
		inviteEmail,
		inviteTokenHash: null,
		inviteExpiresAt: null,
		role,
		status,
		invitedAt: status === "invited" ? NOW : null,
		joinedAt: status === "active" ? NOW : null,
		revokedAt: status === "revoked" ? NOW : null,
		revision: 1,
		createdAt: NOW,
		updatedAt: NOW,
	};
}

function buildHarness() {
	const agencyRepository = createInMemoryAgencyRepository([buildAgency()]);
	const membershipRepository = createInMemoryMembershipRepository([
		buildMembership(OWNER_MEMBERSHIP, OWNER_PRINCIPAL, "owner", "active"),
		buildMembership(ADMIN_MEMBERSHIP, ADMIN_PRINCIPAL, "admin", "active"),
		buildMembership(
			REVOKED_OWNER_MEMBERSHIP,
			EX_OWNER_PRINCIPAL,
			"owner",
			"revoked",
		),
		buildMembership(
			REVOKED_ADMIN_MEMBERSHIP,
			EX_OWNER_PRINCIPAL,
			"admin",
			"revoked",
		),
	]);
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingOrganizationUnitOfWork({
		agencyRepository,
		ownerRepository: createInMemoryOwnerRepository(),
		membershipRepository,
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			principalLookup: createStubPrincipalLookup([
				OWNER_PRINCIPAL,
				ADMIN_PRINCIPAL,
				EX_OWNER_PRINCIPAL,
			]),
		},
		membershipRepository,
		published,
	};
}

async function captureError(work: () => Promise<unknown>): Promise<unknown> {
	try {
		await work();
		return undefined;
	} catch (error) {
		return error;
	}
}

describe("reativacao assistida — D-ORG-046", () => {
	test("reativar membership de role owner e' recusado para admin", async () => {
		const harness = buildHarness();
		const error = await captureError(() =>
			activateMembership(harness.deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				membershipId: REVOKED_OWNER_MEMBERSHIP,
				actorPrincipalId: ADMIN_PRINCIPAL,
				targetPrincipalId: EX_OWNER_PRINCIPAL,
			}),
		);
		expect((error as OrganizationCommandError).organizationCode).toBe(
			"ORG_INVALID_STATUS_TRANSITION",
		);
		// Nada foi reativado nem publicado.
		const membership = await harness.membershipRepository.findById(
			AGENCY_ID,
			REVOKED_OWNER_MEMBERSHIP,
		);
		expect(membership?.status).toBe("revoked");
		expect(harness.published).toHaveLength(0);
	});

	// F-02 do G5 (ANX-460) — o teste anterior aqui afirmava 200 ("owner reativa
	// membership de role owner") e era um FALSO PASS: o repositorio in-memory nao
	// tem o indice parcial `organizations_memberships_one_owner_active_uidx` que,
	// no PostgreSQL, rejeita a gravacao com 23505. O estado "owner revogado" e'
	// inalcancavel pela API (o convite exclui owner; revogar o unico owner ativo e'
	// bloqueado; a transferencia rebaixa o owner anterior para admin), entao a
	// restauracao de autoridade de owner foi REMOVIDA daqui em vez de mantida como
	// superficie morta. A prova de que nao ha 500 vive no teste PG
	// (`integration/assisted-reactivation.integration.test.ts`).
	test("reativar role owner e' recusado tambem para owner (nao ha restauracao de owner)", async () => {
		const harness = buildHarness();
		const error = await captureError(() =>
			activateMembership(harness.deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				membershipId: REVOKED_OWNER_MEMBERSHIP,
				actorPrincipalId: OWNER_PRINCIPAL,
				targetPrincipalId: EX_OWNER_PRINCIPAL,
			}),
		);
		expect((error as OrganizationCommandError).organizationCode).toBe(
			"ORG_INVALID_STATUS_TRANSITION",
		);
		expect((error as OrganizationCommandError).statusCode).toBe(409);
		const membership = await harness.membershipRepository.findById(
			AGENCY_ID,
			REVOKED_OWNER_MEMBERSHIP,
		);
		expect(membership?.status).toBe("revoked");
		expect(harness.published).toHaveLength(0);
	});

	test("admin PODE reativar membership de role admin (dentro do seu nivel)", async () => {
		const harness = buildHarness();
		const result = await activateMembership(harness.deps, {
			commandId: randomUUID(),
			agencyId: AGENCY_ID,
			membershipId: REVOKED_ADMIN_MEMBERSHIP,
			actorPrincipalId: ADMIN_PRINCIPAL,
			targetPrincipalId: EX_OWNER_PRINCIPAL,
		});
		expect(result.aggregateId).toBe(REVOKED_ADMIN_MEMBERSHIP);
		const membership = await harness.membershipRepository.findById(
			AGENCY_ID,
			REVOKED_ADMIN_MEMBERSHIP,
		);
		expect(membership?.status).toBe("active");
	});

	test("reativacao nao revincula a outro principal", async () => {
		const harness = buildHarness();
		const error = await captureError(() =>
			activateMembership(harness.deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				membershipId: REVOKED_ADMIN_MEMBERSHIP,
				actorPrincipalId: OWNER_PRINCIPAL,
				targetPrincipalId: ADMIN_PRINCIPAL,
			}),
		);
		expect((error as OrganizationCommandError).organizationCode).toBe(
			"ORG_INVITE_EMAIL_MISMATCH",
		);
	});

	test("membership ativa nao e' reativada (transicao invalida)", async () => {
		const harness = buildHarness();
		const error = await captureError(() =>
			activateMembership(harness.deps, {
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				membershipId: ADMIN_MEMBERSHIP,
				actorPrincipalId: OWNER_PRINCIPAL,
				targetPrincipalId: ADMIN_PRINCIPAL,
			}),
		);
		expect((error as OrganizationCommandError).organizationCode).toBe(
			"ORG_MEMBERSHIP_NOT_INVITED",
		);
	});
});
