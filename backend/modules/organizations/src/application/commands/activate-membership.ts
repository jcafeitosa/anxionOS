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
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import {
	hashCommandPayload,
	loadIdempotentCommandResult,
	recordOrganizationCommand,
	saveWithRevisionConflictMapping,
	toCommandResultSnapshot,
} from "../command-support";
import { throwOrganizationError } from "../errors";
import { assertActorIsOwnerOrAdmin } from "../services/membership-role-guard";
import { assertPrincipalExists } from "../services/principal-guard";
import { buildAgencyTenantContext } from "../services/tenant-context";

/**
 * Admin/owner assisted activation — bypasses invite email match (D-ORG-036).
 */
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
	await assertPrincipalExists(deps.principalLookup, input.targetPrincipalId);
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
			const actorMembership = await assertActorIsOwnerOrAdmin(
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
			// D-ORG-046 — restaurar autoridade de OWNER e' ato de owner. O convite
			// nunca aceita `role=owner` (schema exclui), entao um admin NAO consegue
			// criar owner; sem esta guarda ele conseguiria o mesmo efeito pela porta
			// dos fundos: reativar uma membership `revoked` de role `owner` e fazer o
			// governance reemitir a baseline de owner (`membership.activated`).
			if (membership.role === "owner" && actorMembership.role !== "owner") {
				throwOrganizationError(
					"ORG_OWNER_REQUIRED",
					"Only an owner can reactivate an owner membership",
				);
			}
			if (membership.status !== "invited" && membership.status !== "revoked") {
				throwOrganizationError(
					"ORG_MEMBERSHIP_NOT_INVITED",
					`Membership ${command.membershipId} is not invited`,
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
				principalId: input.targetPrincipalId,
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
	principalLookup: PrincipalLookup;
}
