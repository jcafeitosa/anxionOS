import {
	type ActivateMembershipCommand,
	activateMembershipCommandSchema,
	type CommandResult,
	commandResultSchema,
} from "@anxionos/contracts/organizations";
import { canTransitionMembershipStatus } from "../../domain/entities/membership";
import { createMembershipActivatedEvent } from "../../domain/events/organization-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import {
	hashCommandPayload,
	loadIdempotentCommandResult,
	recordOrganizationCommand,
	saveWithRevisionConflictMapping,
	toCommandResultSnapshot,
} from "../command-support";
import { throwOrganizationError } from "../errors";
import { assertActorIsOwnerOrAdmin } from "../services/membership-role-guard";
import { buildAgencyTenantContext } from "../services/tenant-context";

/**
 * Admin/owner assisted activation — bypasses invite email match (D-ORG-036).
 */
/**
 * Estreita `principalId` no evento. O gate de consentimento ja' recusou o caso
 * nulo, entao chegar aqui com `null` seria bug de programacao — nao ha' fallback
 * silencioso (o `??` anterior era ramo morto, apontado como INFO pelo G2).
 */
function requireBoundPrincipal(principalId: string | null): string {
	if (!principalId) {
		throw new Error("Activated membership must have a bound principal");
	}
	return principalId;
}

export async function activateMembership(
	deps: ActivateMembershipDeps,
	input: ActivateMembershipInput,
): Promise<CommandResult> {
	const command = activateMembershipCommandSchema.parse(input);
	const intent = {
		commandName: "ActivateMembership",
		aggregateId: command.membershipId,
		requestHash: hashCommandPayload({
			agencyId: command.agencyId,
			membershipId: command.membershipId,
			actorPrincipalId: input.actorPrincipalId,
			targetPrincipalId: input.targetPrincipalId,
		}),
	};
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
		intent,
	);
	if (replay) {
		return replay;
	}
	return deps.unitOfWork.runInTransaction(
		buildAgencyTenantContext(command.agencyId, input.actorPrincipalId),
		async (context) => {
			const raced = await loadIdempotentCommandResult(
				context.commandJournal,
				command.commandId,
				intent,
			);
			if (raced) {
				return raced;
			}
			await assertActorIsOwnerOrAdmin(
				context.membershipRepository,
				input.actorPrincipalId,
				command.agencyId,
			);
			const membership = await context.membershipRepository.findById(
				command.agencyId,
				command.membershipId,
			);
			if (!membership) {
				throwOrganizationError(
					"ORG_AGENCY_NOT_FOUND",
					`Membership ${command.membershipId} not found in agency ${command.agencyId}`,
				);
			}
			if (membership.status !== "invited" && membership.status !== "revoked") {
				throwOrganizationError(
					"ORG_MEMBERSHIP_NOT_INVITED",
					`Membership ${command.membershipId} is not invited`,
				);
			}
			// D-ORG-046 (F-02 do G5) — autoridade de OWNER nao e' ativavel por aqui.
			// `role=owner` so' nasce em `CreateAgency` e `TransferOwnership`, e ambos
			// mantem exatamente UM owner ativo (INV-ORG-02, garantida pelo indice
			// parcial `organizations_memberships_one_owner_active_uidx`). Logo uma
			// membership de owner `revoked` nao e' producivel pela API, e tentar
			// reativa-la colidiria com esse mesmo indice — o `23505` cru subia como
			// 500. Recusar explicitamente e' fail-closed, nao oferece superficie
			// morta e nao promete uma restauracao de autoridade que nao existe.
			if (membership.role === "owner") {
				throwOrganizationError(
					"ORG_INVALID_STATUS_TRANSITION",
					"Owner authority is granted only by CreateAgency or TransferOwnership and cannot be activated here",
				);
			}
			// D-ORG-046 (G5-F2) — consentimento na PRIMEIRA vinculacao. A ativacao
			// assistida nao pode criar vinculo novo: sem `principalId` ja' gravado,
			// quem ativa e' o proprio convidado (`acceptInviteByToken`, que exige o
			// token e a sessao dele). Sem este gate, qualquer owner/admin de uma
			// agency self-serve vinculava o principal de um terceiro sem
			// consentimento — e o 404 "e-mail sem principal" enumerava os e-mails
			// registrados na plataforma. O recusso e' o mesmo codigo exista ou nao
			// principal para o e-mail, entao nao sobra oraculo.
			if (!membership.principalId) {
				throwOrganizationError(
					"ORG_INVITEE_CONSENT_REQUIRED",
					"Assisted activation cannot bind a principal for the first time; the invitee must accept the invite",
				);
			}
			// Reativacao nao pode REVINCULAR a membership a outro principal: o
			// principal resolvido do e-mail do convite tem de ser o ja' vinculado.
			if (membership.principalId !== input.targetPrincipalId) {
				throwOrganizationError(
					"ORG_INVITE_EMAIL_MISMATCH",
					`Membership ${command.membershipId} is bound to another principal`,
				);
			}
			if (
				membership.status === "invited" &&
				membership.inviteExpiresAt &&
				membership.inviteExpiresAt.getTime() <= Date.now()
			) {
				throwOrganizationError(
					"ORG_INVITE_EXPIRED",
					`Invite for membership ${command.membershipId} has expired`,
				);
			}
			if (!canTransitionMembershipStatus(membership.status, "active")) {
				throwOrganizationError(
					"ORG_INVALID_STATUS_TRANSITION",
					`Cannot activate membership from status ${membership.status}`,
				);
			}
			const now = new Date();
			const revision = membership.revision + 1;
			const updated = await saveWithRevisionConflictMapping(() =>
				context.membershipRepository.save({
					...membership,
					status: "active",
					inviteTokenHash: null,
					inviteExpiresAt: null,
					// Reativacao limpa a marca de revogacao; o principal permanece o
					// mesmo (nunca `input.targetPrincipalId`, que veio do cliente).
					revokedAt: null,
					joinedAt: membership.joinedAt ?? now,
					revision,
					updatedAt: now,
				}),
			);
			const result = commandResultSchema.parse({
				aggregateId: updated.id,
				revision: updated.revision,
			});
			const event = createMembershipActivatedEvent({
				membershipId: updated.id,
				agencyId: updated.agencyId,
				// Fato persistido, nunca o parametro do chamador (mesma licao do S4b).
				// O gate de consentimento ja' garantiu `principalId` nao-nulo, entao
				// nao ha' fallback: o tipo estreita aqui.
				principalId: requireBoundPrincipal(updated.principalId),
				role: updated.role,
				revision: updated.revision,
			});
			await recordOrganizationCommand(context, {
				commandId: command.commandId,
				commandName: "ActivateMembership",
				aggregateId: updated.id,
				aggregateType: "Membership",
				revision: updated.revision,
				responseSnapshot: toCommandResultSnapshot(result),
				requestHash: intent.requestHash,
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface ActivateMembershipInput extends ActivateMembershipCommand {
	actorPrincipalId: string;
	targetPrincipalId: string;
}

export interface ActivateMembershipDeps {
	unitOfWork: OrganizationUnitOfWork;
	commandJournal: CommandJournalRepository;
}
