import { describe, expect, test } from "bun:test";
/**
 * S4 (ANX-460) — correcoes de ciclo de vida.
 *
 * Defeitos cobertos, todos reproduzidos antes da correcao:
 *  - S4a: corrida de revisao de Membership vazava o erro cru de dominio ate' o
 *    boundary (500); os 8 modulos que ja' tem `<MOD>_REVISION_CONFLICT`
 *    respondem 409.
 *  - S4b: `revokeMembership` de convite pendente publicava `membership.revoked.v1`
 *    com o `principalId` do ATOR, fato falso: a membership persistida tem
 *    `principalId = null` e o consumer de governance revalida contra o
 *    read-model, rejeitando o evento para sempre.
 *  - S4c: `Agency.save` nao tinha guarda otimista — `UPDATE` cego sobrescrevia
 *    alteracao concorrente em silencio (lost update) e o evento saia com
 *    `previous*` obsoleto.
 *
 * A corrida e' reproduzida de forma determinista: um decorador grava a revisao
 * seguinte **depois** da leitura do comando e devolve o agregado lido — que e'
 * exatamente a ordem de eventos de duas transacoes concorrentes.
 */
import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	ORGANIZATION_EVENT_TYPES,
	updateAgencyMarketsCommandSchema,
} from "@anxionos/contracts/organizations";
import { revokeMembership, updateAgencyMarkets } from "@anxionos/organizations";
import { saveWithRevisionConflictMapping } from "../../modules/organizations/src/application/command-support";
import { OrganizationCommandError } from "../../modules/organizations/src/application/errors";
import type { Agency } from "../../modules/organizations/src/domain/entities/agency";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import { AgencyRevisionConflictError } from "../../modules/organizations/src/domain/errors/agency-errors";
import { MembershipRevisionConflictError } from "../../modules/organizations/src/domain/errors/membership-errors";
import type { AgencyRepository } from "../../modules/organizations/src/domain/ports/agency-repository";
import type { MembershipRepository } from "../../modules/organizations/src/domain/ports/membership-repository";
import {
	createInMemoryAgencyRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryMembershipRepository,
	createInMemoryOwnerRepository,
	createRecordingOrganizationUnitOfWork,
} from "./test-support";

const now = new Date("2026-09-11T12:00:00.000Z");

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_PRINCIPAL = "22222222-2222-4222-8222-222222222222";
const OWNER_MEMBERSHIP = "33333333-3333-4333-8333-333333333333";
const PENDING_MEMBERSHIP = "44444444-4444-4444-8444-444444444444";
const ACTIVE_MEMBERSHIP = "55555555-5555-4555-8555-555555555555";
const ACTIVE_PRINCIPAL = "66666666-6666-4666-8666-666666666666";

function buildAgency(revision = 1): Agency {
	return {
		id: AGENCY_ID,
		ownerPrincipalId: OWNER_PRINCIPAL,
		displayName: "Acme Capital",
		marketScope: "both",
		status: "ready",
		onboardingStep: "ready",
		revision,
		createdAt: now,
		updatedAt: now,
	};
}

function buildMembership(
	overrides: Partial<Membership> & Pick<Membership, "id" | "role" | "status">,
): Membership {
	return {
		agencyId: AGENCY_ID,
		principalId: null,
		inviteEmail: null,
		inviteTokenHash: null,
		inviteExpiresAt: null,
		invitedAt: null,
		joinedAt: null,
		revokedAt: null,
		revision: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

interface HarnessInput {
	memberships: Membership[];
	/**
	 * Grava a revisao seguinte na linha alvo **depois** da leitura, modelando a
	 * transacao concorrente que commita entre o `SELECT` e o `UPDATE` deste
	 * comando. O comando segue com o agregado da revisao anterior.
	 */
	raceAfterMembershipRead?: string;
	raceAfterAgencyRead?: boolean;
}

function buildHarness(input: HarnessInput) {
	const agencyRepository = createInMemoryAgencyRepository([buildAgency()]);
	const storedMemberships = createInMemoryMembershipRepository(
		input.memberships,
	);
	const commandJournal = createInMemoryCommandJournalRepository();

	let membershipRaceFired = false;
	const membershipRepository: MembershipRepository = {
		...storedMemberships,
		async findById(agencyId, membershipId) {
			const found = await storedMemberships.findById(agencyId, membershipId);
			if (
				found &&
				!membershipRaceFired &&
				membershipId === input.raceAfterMembershipRead
			) {
				membershipRaceFired = true;
				await storedMemberships.save({
					...found,
					revision: found.revision + 1,
					updatedAt: now,
				});
			}
			return found;
		},
	};

	let agencyRaceFired = false;
	const racingAgencyRepository: AgencyRepository = {
		...agencyRepository,
		async findByAgencyId(agencyId) {
			const found = await agencyRepository.findByAgencyId(agencyId);
			if (found && input.raceAfterAgencyRead && !agencyRaceFired) {
				agencyRaceFired = true;
				await agencyRepository.save({
					...found,
					revision: found.revision + 1,
					updatedAt: now,
				});
			}
			return found;
		},
	};

	const { unitOfWork, published } = createRecordingOrganizationUnitOfWork({
		agencyRepository: racingAgencyRepository,
		ownerRepository: createInMemoryOwnerRepository(),
		membershipRepository,
		commandJournal,
	});
	return {
		unitOfWork,
		published,
		commandJournal,
		agencyRepository,
		membershipRepository: storedMemberships,
	};
}

const ownerMembership = buildMembership({
	id: OWNER_MEMBERSHIP,
	principalId: OWNER_PRINCIPAL,
	role: "owner",
	status: "active",
	joinedAt: now,
});

function findEvent(
	published: DomainEventEnvelope[],
	eventType: string,
): DomainEventEnvelope | undefined {
	return published.find((envelope) => envelope.eventType === eventType);
}

async function captureError(work: () => Promise<unknown>): Promise<unknown> {
	try {
		await work();
		return undefined;
	} catch (error) {
		return error;
	}
}

describe("saveWithRevisionConflictMapping", () => {
	test("traduz MembershipRevisionConflictError em ORG_REVISION_CONFLICT 409", async () => {
		const error = await captureError(() =>
			saveWithRevisionConflictMapping(async () => {
				throw new MembershipRevisionConflictError();
			}),
		);
		const commandError = error as OrganizationCommandError;
		expect(commandError).toBeInstanceOf(OrganizationCommandError);
		expect(commandError.organizationCode).toBe("ORG_REVISION_CONFLICT");
		expect(commandError.statusCode).toBe(409);
	});

	test("traduz AgencyRevisionConflictError em ORG_REVISION_CONFLICT 409", async () => {
		const error = await captureError(() =>
			saveWithRevisionConflictMapping(async () => {
				throw new AgencyRevisionConflictError();
			}),
		);
		const commandError = error as OrganizationCommandError;
		expect(commandError).toBeInstanceOf(OrganizationCommandError);
		expect(commandError.organizationCode).toBe("ORG_REVISION_CONFLICT");
		expect(commandError.statusCode).toBe(409);
	});

	test("preserva erros que nao sao de revisao", async () => {
		const original = new Error("boom");
		const error = await captureError(() =>
			saveWithRevisionConflictMapping(async () => {
				throw original;
			}),
		);
		expect(error).toBe(original);
	});
});

describe("S4b — membership.revoked.v1 publica o fato persistido, nao o ator", () => {
	test("convite pendente revogado publica principalId null", async () => {
		// Convite que nunca foi aceito: nao existe principal associado.
		const pending = buildMembership({
			id: PENDING_MEMBERSHIP,
			principalId: null,
			role: "admin",
			status: "invited",
			inviteEmail: "pending@example.com",
			inviteTokenHash: "hash-pending",
			inviteExpiresAt: new Date(now.getTime() + 86_400_000),
			invitedAt: now,
		});
		const harness = buildHarness({ memberships: [ownerMembership, pending] });

		const result = await revokeMembership(
			{
				unitOfWork: harness.unitOfWork,
				commandJournal: harness.commandJournal,
			},
			{
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				membershipId: PENDING_MEMBERSHIP,
				actorPrincipalId: OWNER_PRINCIPAL,
			},
		);

		expect(result.aggregateId).toBe(PENDING_MEMBERSHIP);
		const event = findEvent(
			harness.published,
			ORGANIZATION_EVENT_TYPES.MEMBERSHIP_REVOKED,
		);
		expect(event).toBeDefined();
		const payload = event?.payload as { principalId: unknown };
		// O defeito publicava OWNER_PRINCIPAL aqui.
		expect(payload.principalId).toBeNull();
		expect(payload.principalId).not.toBe(OWNER_PRINCIPAL);
	});

	test("membership ativa revogada continua publicando o principal real", async () => {
		const active = buildMembership({
			id: ACTIVE_MEMBERSHIP,
			principalId: ACTIVE_PRINCIPAL,
			role: "admin",
			status: "active",
			joinedAt: now,
		});
		const harness = buildHarness({ memberships: [ownerMembership, active] });

		await revokeMembership(
			{
				unitOfWork: harness.unitOfWork,
				commandJournal: harness.commandJournal,
			},
			{
				commandId: randomUUID(),
				agencyId: AGENCY_ID,
				membershipId: ACTIVE_MEMBERSHIP,
				actorPrincipalId: OWNER_PRINCIPAL,
			},
		);

		const event = findEvent(
			harness.published,
			ORGANIZATION_EVENT_TYPES.MEMBERSHIP_REVOKED,
		);
		const payload = event?.payload as { principalId: unknown };
		expect(payload.principalId).toBe(ACTIVE_PRINCIPAL);
	});
});

describe("S4a — corrida de revisao de Membership e' 409 institucional", () => {
	test("perdedor da corrida recebe ORG_REVISION_CONFLICT, nunca 500", async () => {
		const active = buildMembership({
			id: ACTIVE_MEMBERSHIP,
			principalId: ACTIVE_PRINCIPAL,
			role: "admin",
			status: "active",
			joinedAt: now,
		});
		const harness = buildHarness({
			memberships: [ownerMembership, active],
			raceAfterMembershipRead: ACTIVE_MEMBERSHIP,
		});

		const error = await captureError(() =>
			revokeMembership(
				{
					unitOfWork: harness.unitOfWork,
					commandJournal: harness.commandJournal,
				},
				{
					commandId: randomUUID(),
					agencyId: AGENCY_ID,
					membershipId: ACTIVE_MEMBERSHIP,
					actorPrincipalId: OWNER_PRINCIPAL,
				},
			),
		);

		const commandError = error as OrganizationCommandError;
		expect(commandError).toBeInstanceOf(OrganizationCommandError);
		expect(commandError.organizationCode).toBe("ORG_REVISION_CONFLICT");
		expect(commandError.statusCode).toBe(409);
		// A gravacao concorrente permanece: nada foi sobrescrito nem publicado.
		const persisted = await harness.membershipRepository.findById(
			AGENCY_ID,
			ACTIVE_MEMBERSHIP,
		);
		expect(persisted?.revision).toBe(2);
		expect(persisted?.status).toBe("active");
		expect(
			findEvent(harness.published, ORGANIZATION_EVENT_TYPES.MEMBERSHIP_REVOKED),
		).toBeUndefined();
	});
});

describe("S4c — Agency.save tem guarda otimista (sem lost update)", () => {
	test("perdedor da corrida recebe ORG_REVISION_CONFLICT e nao sobrescreve", async () => {
		const harness = buildHarness({
			memberships: [ownerMembership],
			raceAfterAgencyRead: true,
		});

		const error = await captureError(() =>
			updateAgencyMarkets(
				{
					unitOfWork: harness.unitOfWork,
					commandJournal: harness.commandJournal,
				},
				{
					...updateAgencyMarketsCommandSchema.parse({
						commandId: randomUUID(),
						agencyId: AGENCY_ID,
						marketScope: "crypto",
					}),
					actorPrincipalId: OWNER_PRINCIPAL,
				},
			),
		);

		const commandError = error as OrganizationCommandError;
		expect(commandError).toBeInstanceOf(OrganizationCommandError);
		expect(commandError.organizationCode).toBe("ORG_REVISION_CONFLICT");
		expect(commandError.statusCode).toBe(409);
		// A gravacao concorrente permanece intacta.
		const persisted = await harness.agencyRepository.findByAgencyId(AGENCY_ID);
		expect(persisted?.revision).toBe(2);
		expect(persisted?.marketScope).toBe("both");
		expect(
			findEvent(
				harness.published,
				ORGANIZATION_EVENT_TYPES.AGENCY_MARKETS_UPDATED,
			),
		).toBeUndefined();
	});
});
