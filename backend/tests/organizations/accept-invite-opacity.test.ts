import { describe, expect, test } from "bun:test";
import { acceptInviteByToken, inviteMember } from "@anxionos/organizations";
import {
	PENDING_INVITE_CONFLICT_MESSAGE,
	throwMembershipUniquenessConflict,
} from "../../modules/organizations/src/application/command-support";
import { OrganizationCommandError } from "../../modules/organizations/src/application/errors";
import type { Agency } from "../../modules/organizations/src/domain/entities/agency";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import {
	MembershipRevisionConflictError,
	MembershipUniquenessConflictError,
} from "../../modules/organizations/src/domain/errors/membership-errors";
import type { MembershipRepository } from "../../modules/organizations/src/domain/ports/membership-repository";
import {
	createInMemoryAgencyRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryMembershipRepository,
	createInMemoryOwnerRepository,
	createRecordingOrganizationUnitOfWork,
	createTestInviteTokenHasher,
} from "./test-support";

/**
 * ANX-460 — MEDIUM-1 do G3 (QA) e LOW-2 do G5 (Red Team).
 *
 * O G3 provou **ausencia de oraculo**: trocar o conflito de revisao do aceite de
 * `ORG_AGENCY_NOT_FOUND` (404 opaco) para `ORG_REVISION_CONFLICT` (409) deixava a
 * suite **inteira verde** (`401 pass / 0 fail`). O contrato de opacidade — "um
 * conflito de revisao no aceite e' indistinguivel de um token invalido" — existia
 * apenas no codigo, sem teste. Este arquivo o pina.
 *
 * Por que a opacidade importa: `acceptInviteByToken` recebe um token do portador.
 * Se o conflito de revisao respondesse 409 e o token invalido 404, um atacante sem
 * token obteria um oraculo de existencia/consumo do convite so' pela diferenca de
 * status. O mesmo raciocinio vale para o token consumido.
 *
 * O `save` do repositorio em memoria ja' lanca `MembershipRevisionConflictError`
 * quando a revisao diverge; aqui a divergencia e' *forcada* no ponto exato da
 * ativacao para que o cenario seja deterministico (sem corrida real). O override
 * so' intercepta a gravacao de ativacao (`status === "active"`), deixando
 * `inviteMember` funcionar normalmente.
 */

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerPrincipalId = "11111111-1111-4111-8111-111111111111";
const inviteePrincipalId = "33333333-3333-4333-8333-333333333333";
const inviteeEmail = "operator@example.com";

const agency: Agency = {
	id: agencyId,
	ownerPrincipalId,
	displayName: "Acme Capital",
	marketScope: "both",
	status: "ready",
	onboardingStep: "ready",
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	updatedAt: new Date("2026-09-08T12:00:00.000Z"),
};

const ownerMembership: Membership = {
	id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	agencyId,
	principalId: ownerPrincipalId,
	inviteEmail: null,
	inviteTokenHash: null,
	inviteExpiresAt: null,
	role: "owner",
	status: "active",
	invitedAt: null,
	joinedAt: new Date("2026-09-08T12:00:00.000Z"),
	revokedAt: null,
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	updatedAt: new Date("2026-09-08T12:00:00.000Z"),
};

/**
 * Intercepta apenas a gravacao de ativacao do aceite. Qualquer outra gravacao
 * (o convite criado por `inviteMember`) segue para o repositorio em memoria.
 */
type ActivationSaveFault = (membership: Membership) => Error | null;

function createDeps(fault?: ActivationSaveFault) {
	const agencyRepository = createInMemoryAgencyRepository([agency]);
	const inner = createInMemoryMembershipRepository([ownerMembership]);
	const membershipRepository: MembershipRepository = fault
		? {
				...inner,
				async save(membership) {
					if (membership.status === "active") {
						const error = fault(membership);
						if (error) {
							throw error;
						}
					}
					return inner.save(membership);
				},
			}
		: inner;
	const commandJournal = createInMemoryCommandJournalRepository();
	const inviteTokenHasher = createTestInviteTokenHasher();
	const { unitOfWork } = createRecordingOrganizationUnitOfWork({
		agencyRepository,
		ownerRepository: createInMemoryOwnerRepository(),
		membershipRepository,
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			membershipRepository,
			inviteTokenHasher,
		},
		inviteDeps: { unitOfWork, commandJournal, inviteTokenHasher },
	};
}

async function capture(
	operation: () => Promise<unknown>,
): Promise<OrganizationCommandError> {
	try {
		await operation();
	} catch (error) {
		if (error instanceof OrganizationCommandError) {
			return error;
		}
		throw error;
	}
	throw new Error("expected the command to reject");
}

async function inviteAndCaptureFault(
	fault: ActivationSaveFault,
	commandId: string,
): Promise<{
	accepted: OrganizationCommandError;
	invalidToken: OrganizationCommandError;
}> {
	const { deps, inviteDeps } = createDeps(fault);
	const invited = await inviteMember(inviteDeps, {
		commandId: "40404040-4040-4040-8040-404040404040",
		agencyId,
		email: inviteeEmail,
		role: "operator",
		actorPrincipalId: ownerPrincipalId,
	});
	// Controle: token que nao existe no repositorio — a referencia de opacidade.
	const invalidToken = await capture(() =>
		acceptInviteByToken(deps, {
			commandId: "60606060-6060-4060-8060-606060606060",
			token: "token-que-nao-existe",
			sessionPrincipalId: inviteePrincipalId,
			sessionEmail: inviteeEmail,
		}),
	);
	const accepted = await capture(() =>
		acceptInviteByToken(deps, {
			commandId,
			token: invited.inviteToken,
			sessionPrincipalId: inviteePrincipalId,
			sessionEmail: inviteeEmail,
		}),
	);
	return { accepted, invalidToken };
}

describe("acceptInviteByToken — opacidade do conflito de revisao (ANX-460)", () => {
	test("conflito de revisao e' 404 opaco, indistinguivel de token inexistente", async () => {
		const { accepted, invalidToken } = await inviteAndCaptureFault(
			() => new MembershipRevisionConflictError(),
			"70707070-7070-4070-8070-707070707070",
		);

		expect(invalidToken.organizationCode).toBe("ORG_AGENCY_NOT_FOUND");
		expect(invalidToken.statusCode).toBe(404);

		// A assercao que o G3 mostrou faltar: se este ponto regredir para
		// ORG_REVISION_CONFLICT (409), a comparacao de status/codigo/mensagem falha.
		expect(accepted.organizationCode).toBe("ORG_AGENCY_NOT_FOUND");
		expect(accepted.statusCode).toBe(404);
		expect(accepted.message).toBe(invalidToken.message);
	});

	test("token de convite consumido no caminho de gravacao tambem e' opaco", async () => {
		// Mesma classe de vazamento pelo outro lado: o convite existe, mas a
		// gravacao falha por revisao — a resposta nao pode revelar que o token era
		// valido e que alguem chegou perto de consumi-lo.
		const { accepted, invalidToken } = await inviteAndCaptureFault(
			() => new MembershipRevisionConflictError(),
			"80808080-8080-4080-8080-808080808080",
		);
		expect(accepted.details).toEqual(invalidToken.details);
		expect(accepted.code).toBe(invalidToken.code);
	});

	test("colisao de unicidade NAO usa o 404 opaco e e' derivada da CONSTRAINT", async () => {
		// G5 LOW-2: a mensagem deste ponto era FIXA em "active membership", o que
		// ficaria errado quando a colisao viesse do indice de convite pendente.
		const activePrincipal = await inviteAndCaptureFault(
			() =>
				new MembershipUniquenessConflictError(
					"organizations_memberships_agency_principal_active_uidx",
				),
			"90909090-9090-4090-8090-909090909090",
		);
		expect(activePrincipal.accepted.organizationCode).toBe(
			"ORG_MEMBERSHIP_EXISTS",
		);
		expect(activePrincipal.accepted.statusCode).toBe(409);
		expect(activePrincipal.accepted.message).toBe(
			"Target principal already has an active membership in this agency",
		);

		const pendingInvite = await inviteAndCaptureFault(
			() =>
				new MembershipUniquenessConflictError(
					"organizations_memberships_agency_email_invited_uidx",
				),
			"a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0",
		);
		expect(pendingInvite.accepted.organizationCode).toBe(
			"ORG_MEMBERSHIP_EXISTS",
		);
		expect(pendingInvite.accepted.message).toBe(
			PENDING_INVITE_CONFLICT_MESSAGE,
		);

		const otherOwner = await inviteAndCaptureFault(
			() =>
				new MembershipUniquenessConflictError(
					"organizations_memberships_one_owner_active_uidx",
				),
			"b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0",
		);
		expect(otherOwner.accepted.organizationCode).toBe("ORG_OWNER_REQUIRED");
		expect(otherOwner.accepted.statusCode).toBe(409);
	});

	test("constraint fora da uniao vira 409 ORG_MEMBERSHIP_EXISTS explicito (ANX-493)", () => {
		// O fallback explicito pedido pelo G4/G5 foi implementado na ANX-493: o
		// caminho nao morre mais em TypeError -> 500. O que continua proibido e'
		// devolver o conflito ERRADO — o mapeamento derivado da constraint segue
		// mandando; a uniao desconhecida recebe o 409 generico institucional.
		const unclassified = new MembershipUniquenessConflictError(
			"organizations_memberships_pkey" as never,
		);
		let thrown: unknown;
		try {
			throwMembershipUniquenessConflict(unclassified);
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(OrganizationCommandError);
		const mapped = thrown as OrganizationCommandError;
		expect(mapped.organizationCode).toBe("ORG_MEMBERSHIP_EXISTS");
		expect(mapped.statusCode).toBe(409);
		// `cause` preservada: a cadeia de diagnostico sobrevive ao fallback.
		expect(mapped.cause).toBe(unclassified);
	});
});
