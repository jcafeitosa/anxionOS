import {
	type AcceptInviteByTokenCommand,
	acceptInviteByTokenCommandSchema,
	type CommandResult,
	commandResultSchema,
} from "@anxionos/contracts/organizations";
import { canTransitionMembershipStatus } from "../../domain/entities/membership";
import {
	MembershipRevisionConflictError,
	MembershipUniquenessConflictError,
} from "../../domain/errors/membership-errors";
import { createMembershipActivatedEvent } from "../../domain/events/organization-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { InviteTokenHasher } from "../../domain/ports/invite-token-hasher";
import type { MembershipRepository } from "../../domain/ports/membership-repository";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import {
	hashCommandPayload,
	loadIdempotentCommandResult,
	recordOrganizationCommand,
	throwMembershipUniquenessConflict,
	toCommandResultSnapshot,
} from "../command-support";
import { throwOrganizationError } from "../errors";
import { buildAgencyTenantContext } from "../services/tenant-context";

/**
 * Accept invite by token — requires session email match (D-ORG-034).
 * HTTP wiring deferred to S6.
 */
export async function acceptInviteByToken(
	deps: AcceptInviteByTokenDeps,
	input: AcceptInviteByTokenInput,
): Promise<CommandResult> {
	const command = acceptInviteByTokenCommandSchema.parse(input);
	const tokenHash = deps.inviteTokenHasher.hash(command.token);
	// O agregado so' e' conhecido depois de resolver o token (que fornece o
	// tenant), entao a intencao e' fixada pelo `requestHash` do token + sessao.
	// O replay precisa vir ANTES da busca por token: um retry legitimo apos o
	// convite ja' ter sido consumido nao pode estourar "token invalido".
	const intent = {
		commandName: "AcceptInviteByToken",
		requestHash: hashCommandPayload({
			tokenHash,
			sessionPrincipalId: input.sessionPrincipalId,
			sessionEmail: input.sessionEmail.toLowerCase(),
		}),
	};
	// Red Team (Davi): NAO chamar loadIdempotentCommandResult aqui, fora do tenant
	// context. O replay deve acontecer DENTRO da transacao com app.tenant_id definido.
	// O comentário original dizia "replay ANTES da busca por token para evitar 'token
	// invalido' no retry", mas isso quebrava isolamento cross-tenant. A solução correta
	// é: buscar o token FORA (para obter agencyId), depois fazer replay DENTRO da
	// transação (primeiro passo) com tenant_id correto.
	const tokenMembership =
		await deps.membershipRepository.findInvitedByTokenHash(tokenHash);
	if (!tokenMembership) {
		throwOrganizationError(
			"ORG_AGENCY_NOT_FOUND",
			"Invite token is invalid or already consumed",
		);
	}
	return deps.unitOfWork.runInTransaction(
		buildAgencyTenantContext(
			tokenMembership.agencyId,
			input.sessionPrincipalId,
		),
		async (context) => {
			// Replay como PRIMEIRA operacao da transacao, antes das validacoes de
			// estado (token consumido/revogado) que quebrariam o retry legitimo.
			const raced = await loadIdempotentCommandResult(
				context.commandJournal,
				command.commandId,
				intent,
				tokenMembership.agencyId, // tenant_id
			);
			if (raced) {
				return raced;
			}
			const membership =
				await context.membershipRepository.findInvitedByTokenHash(tokenHash);
			if (!membership || membership.status !== "invited") {
				throwOrganizationError(
					"ORG_AGENCY_NOT_FOUND",
					"Invite token is invalid or already consumed",
				);
			}
			if (
				membership.inviteExpiresAt &&
				membership.inviteExpiresAt.getTime() <= Date.now()
			) {
				throwOrganizationError(
					"ORG_INVITE_EXPIRED",
					"Invite token has expired",
				);
			}
			if (
				!membership.inviteEmail ||
				membership.inviteEmail.toLowerCase() !==
					input.sessionEmail.toLowerCase()
			) {
				throwOrganizationError(
					"ORG_INVITE_EMAIL_MISMATCH",
					"Session email does not match the invited email",
				);
			}
			if (membership.status !== "invited") {
				throwOrganizationError(
					"ORG_MEMBERSHIP_NOT_INVITED",
					`Membership ${membership.id} is not invited`,
				);
			}
			if (
				!membership.inviteTokenHash ||
				!deps.inviteTokenHasher.verify(
					command.token,
					membership.inviteTokenHash,
				)
			) {
				throwOrganizationError(
					"ORG_AGENCY_NOT_FOUND",
					"Invite token is invalid or already consumed",
				);
			}
			if (!canTransitionMembershipStatus(membership.status, "active")) {
				throwOrganizationError(
					"ORG_INVALID_STATUS_TRANSITION",
					`Cannot activate membership from status ${membership.status}`,
				);
			}
			// D-ORG-049 (F-03 do G5): a autoridade de OWNER so' nasce em
			// `CreateAgency`/`TransferOwnership`. Sem esta guarda, um convite
			// `role=owner` (impossivel pelo schema HTTP, mas possivel por seed/DBA)
			// instalava owner no aceite e o governance reemitia a baseline. Mesma
			// recusa de `activateMembership`, para a autoridade nao depender de um
			// unico ponto a montante.
			if (membership.role === "owner") {
				throwOrganizationError(
					"ORG_INVALID_STATUS_TRANSITION",
					"Owner authority is granted only by CreateAgency or TransferOwnership and cannot be accepted here",
				);
			}
			const now = new Date();
			const revision = membership.revision + 1;
			let updated;
			try {
				updated = await context.membershipRepository.save({
					...membership,
					principalId: input.sessionPrincipalId,
					status: "active",
					// Keep the one-way token fingerprint as a lookup anchor for a
					// legitimate idempotent replay. A new command still fails closed
					// because the status is no longer `invited`.
					inviteTokenHash: membership.inviteTokenHash,
					inviteExpiresAt: null,
					joinedAt: now,
					revision,
					updatedAt: now,
				});
			} catch (error) {
				// ANX-482/F-01: o principal ja' tem outro vinculo ATIVO nesta agency
				// (ex.: o membro foi reconvidado e aceitou). O `23505` do indice
				// parcial vira 409 institucional — antes subia como 500 com o erro do
				// driver. Nao usa o 404 opaco do conflito de revisao: aqui nao ha'
				// nada a esconder (o principal e' o dono da propria sessao).
				if (error instanceof MembershipUniquenessConflictError) {
					// Mesmo mapeamento derivado da constraint usado pelo wrapper: antes
					// este ponto tinha mensagem FIXA de "active membership", que ficaria
					// errada se a colisao fosse do indice de convite (G5 LOW-2).
					throwMembershipUniquenessConflict(error);
				}
				if (error instanceof MembershipRevisionConflictError) {
					throwOrganizationError(
						"ORG_AGENCY_NOT_FOUND",
						"Invite token is invalid or already consumed",
					);
				}
				throw error;
			}
			const result = commandResultSchema.parse({
				aggregateId: updated.id,
				revision: updated.revision,
			});
			const event = createMembershipActivatedEvent({
				membershipId: updated.id,
				agencyId: updated.agencyId,
				principalId: input.sessionPrincipalId,
				role: updated.role,
				revision: updated.revision,
			});
			await recordOrganizationCommand(
				context,
				{
					commandId: command.commandId,
					commandName: "AcceptInviteByToken",
					aggregateId: updated.id,
					aggregateType: "Membership",
					revision: updated.revision,
					responseSnapshot: toCommandResultSnapshot(result),
					requestHash: intent.requestHash,
				},
				membership.agencyId,
			);
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface AcceptInviteByTokenInput extends AcceptInviteByTokenCommand {
	sessionPrincipalId: string;
	sessionEmail: string;
}

export interface AcceptInviteByTokenDeps {
	unitOfWork: OrganizationUnitOfWork;
	commandJournal: CommandJournalRepository;
	membershipRepository: MembershipRepository;
	inviteTokenHasher: InviteTokenHasher;
}
