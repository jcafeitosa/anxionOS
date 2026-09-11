import { randomBytes, randomUUID } from "node:crypto";
import {
	type CommandResult,
	commandResultSchema,
	type InviteMemberCommand,
	inviteMemberCommandSchema,
} from "@anxionos/contracts/organizations";
import { createMembershipInvitedEvent } from "../../domain/events/organization-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { InviteTokenHasher } from "../../domain/ports/invite-token-hasher";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import {
	hashCommandPayload,
	loadIdempotentCommandResult,
	PENDING_INVITE_CONFLICT_MESSAGE,
	recordOrganizationCommand,
	saveWithRevisionConflictMapping,
	toCommandResultSnapshot,
} from "../command-support";
import { throwOrganizationError } from "../errors";
import { INVITE_TTL_MS } from "../invite-constants";
import { assertActorIsOwnerOrAdmin } from "../services/membership-role-guard";
import { buildAgencyTenantContext } from "../services/tenant-context";

export async function inviteMember(
	deps: InviteMemberDeps,
	input: InviteMemberInput,
): Promise<InviteMemberResult> {
	const command = inviteMemberCommandSchema.parse(input);
	// O comando CRIA o agregado (a membership). O `requestHash` fixa a intencao
	// (agencia + e-mail + papel + ator) para que reusar a key com outro payload
	// seja 409, e nao um 200 sem aplicar.
	//
	// G2 (ANX-460): o e-mail entra NORMALIZADO em minusculas. A busca de convite
	// (`findInvitedByAgencyAndEmail`) e o indice unico parcial comparam
	// `lower(invite_email)`, entao `Ana@x.com` e `ana@x.com` sao o MESMO convite;
	// hashear o texto cru fazia um retry legitimo com outra caixa virar 409 em vez
	// de replay. Mesma normalizacao usada por `acceptInviteByToken` na sessao.
	const requestHash = hashCommandPayload({
		agencyId: command.agencyId,
		email: command.email.toLowerCase(),
		role: command.role,
		actorPrincipalId: input.actorPrincipalId,
	});
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
		{ commandName: "InviteMember", requestHash },
	);
	if (replay) {
		return { result: replay, inviteToken: "" };
	}
	return deps.unitOfWork.runInTransaction(
		buildAgencyTenantContext(command.agencyId, input.actorPrincipalId),
		async (context) => {
			const raced = await loadIdempotentCommandResult(
				context.commandJournal,
				command.commandId,
				{
					commandName: "InviteMember",
					requestHash,
					// O agregado e' criado aqui; confirma que o journal aponta para uma
					// membership que carrega o mesmo payload/agencia.
					matchesAggregate: async (aggregateId) => {
						const membership = await context.membershipRepository.findById(
							command.agencyId,
							aggregateId,
						);
						if (!membership) {
							return false;
						}
						return (
							membership.agencyId === command.agencyId &&
							// F-04/G2: compara NORMALIZADO, igual ao `requestHash` e ao
							// indice parcial (`lower(invite_email)`). Comparar o texto cru
							// fazia um retry legitimo com outra caixa virar 409 no caminho
							// de corrida, mesmo com o hash ja' normalizado.
							membership.inviteEmail?.toLowerCase() ===
								command.email.toLowerCase() &&
							membership.role === command.role
						);
					},
				},
			);
			if (raced) {
				return { result: raced, inviteToken: "" };
			}
			await assertActorIsOwnerOrAdmin(
				context.membershipRepository,
				input.actorPrincipalId,
				command.agencyId,
			);
			const agency = await context.agencyRepository.findByAgencyId(
				command.agencyId,
			);
			if (!agency) {
				throwOrganizationError(
					"ORG_AGENCY_NOT_FOUND",
					`Agency ${command.agencyId} not found`,
				);
			}
			const existingInvite =
				await context.membershipRepository.findInvitedByAgencyAndEmail(
					command.agencyId,
					command.email,
				);
			if (existingInvite) {
				// Mensagem UNICA com o caminho de corrida (mesmo indice parcial), para
				// o cliente nao ver dois textos para o mesmo codigo.
				throwOrganizationError(
					"ORG_MEMBERSHIP_EXISTS",
					PENDING_INVITE_CONFLICT_MESSAGE,
				);
			}
			const membershipId = randomUUID();
			const inviteToken = randomBytes(32).toString("base64url");
			const inviteTokenHash = deps.inviteTokenHasher.hash(inviteToken);
			const now = new Date();
			const inviteExpiresAt = new Date(now.getTime() + INVITE_TTL_MS);
			const revision = 1;
			// F-01 (G3/G4/G5): o `save` tem de passar pelo wrapper. Sem ele, a corrida
			// de convites duplicados para o mesmo e-mail viola
			// `..._agency_email_invited_uidx` e o dominio sobe cru -> 500. O wrapper
			// converte em 409 `ORG_MEMBERSHIP_EXISTS` (mesmo codigo do caminho
			// sequencial, que ja' e' detectado pelo pre-check).
			await saveWithRevisionConflictMapping(() =>
				context.membershipRepository.save({
					id: membershipId,
					agencyId: command.agencyId,
					principalId: null,
					inviteEmail: command.email,
					inviteTokenHash,
					inviteExpiresAt,
					role: command.role,
					status: "invited",
					invitedAt: now,
					joinedAt: null,
					revokedAt: null,
					revision,
					createdAt: now,
					updatedAt: now,
				}),
			);
			const result = commandResultSchema.parse({
				aggregateId: membershipId,
				revision,
			});
			const event = createMembershipInvitedEvent({
				membershipId,
				agencyId: command.agencyId,
				email: command.email,
				role: command.role,
				revision,
			});
			await recordOrganizationCommand(context, {
				commandId: command.commandId,
				commandName: "InviteMember",
				aggregateId: membershipId,
				aggregateType: "Membership",
				revision,
				responseSnapshot: toCommandResultSnapshot(result),
				requestHash,
			});
			await context.publishEvents([event]);
			return { result, inviteToken };
		},
	);
}

export interface InviteMemberInput extends InviteMemberCommand {
	actorPrincipalId: string;
}

export interface InviteMemberDeps {
	unitOfWork: OrganizationUnitOfWork;
	commandJournal: CommandJournalRepository;
	inviteTokenHasher: InviteTokenHasher;
}

export interface InviteMemberResult {
	result: CommandResult;
	inviteToken: string;
}
