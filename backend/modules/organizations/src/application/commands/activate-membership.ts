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
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOrganizationError } from "../errors";
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
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) {
		return replay;
	}
	await assertPrincipalExists(deps.principalLookup, input.targetPrincipalId);
	return deps.unitOfWork.runInTransaction(
		buildAgencyTenantContext(command.agencyId, input.actorPrincipalId),
		async (context) => {
			const raced = await context.commandJournal.findByCommandId(
				command.commandId,
			);
			if (raced) {
				return parseCommandResultSnapshot(raced.responseSnapshot);
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
			if (membership.status !== "invited") {
				throwOrganizationError(
					"ORG_MEMBERSHIP_NOT_INVITED",
					`Membership ${command.membershipId} is not invited`,
				);
			}
			if (
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
			const updated = await context.membershipRepository.save({
				...membership,
				principalId: input.targetPrincipalId,
				status: "active",
				inviteTokenHash: null,
				inviteExpiresAt: null,
				joinedAt: now,
				revision,
				updatedAt: now,
			});
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
			await context.commandJournal.record({
				commandId: command.commandId,
				commandName: "ActivateMembership",
				aggregateId: updated.id,
				aggregateType: "Membership",
				revision: updated.revision,
				responseSnapshot: toCommandResultSnapshot(result),
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
