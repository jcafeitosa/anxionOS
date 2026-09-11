import {
	type CommandResult,
	commandResultSchema,
	type RevokeMembershipCommand,
	revokeMembershipCommandSchema,
} from "@anxionos/contracts/organizations";
import {
	canTransitionMembershipStatus,
	wouldViolateOwnerRequired,
} from "../../domain/entities/membership";
import { createMembershipRevokedEvent } from "../../domain/events/organization-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOrganizationError } from "../errors";
import { assertActorIsOwnerOrAdmin } from "../services/membership-role-guard";
import { buildAgencyTenantContext } from "../services/tenant-context";

export async function revokeMembership(
	deps: RevokeMembershipDeps,
	input: RevokeMembershipInput,
): Promise<CommandResult> {
	const command = revokeMembershipCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) {
		return replay;
	}
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
			if (membership.status === "revoked") {
				const unchanged = commandResultSchema.parse({
					aggregateId: membership.id,
					revision: membership.revision,
				});
				await context.commandJournal.record({
					commandId: command.commandId,
					commandName: "RevokeMembership",
					aggregateId: membership.id,
					aggregateType: "Membership",
					revision: membership.revision,
					responseSnapshot: toCommandResultSnapshot(unchanged),
				});
				return unchanged;
			}
			if (!canTransitionMembershipStatus(membership.status, "revoked")) {
				throwOrganizationError(
					"ORG_INVALID_STATUS_TRANSITION",
					`Cannot revoke membership from status ${membership.status}`,
				);
			}
			const agencyMemberships = await context.membershipRepository.listByAgency(
				command.agencyId,
			);
			if (wouldViolateOwnerRequired(agencyMemberships, command.membershipId)) {
				throwOrganizationError(
					"ORG_OWNER_REQUIRED",
					"Cannot revoke the sole active owner of the agency",
				);
			}
			const now = new Date();
			const revision = membership.revision + 1;
			const updated = await context.membershipRepository.save({
				...membership,
				status: "revoked",
				inviteTokenHash: null,
				inviteExpiresAt: null,
				revokedAt: now,
				revision,
				updatedAt: now,
			});
			const result = commandResultSchema.parse({
				aggregateId: updated.id,
				revision: updated.revision,
			});
			const event = createMembershipRevokedEvent({
				membershipId: updated.id,
				agencyId: updated.agencyId,
				principalId: updated.principalId ?? input.actorPrincipalId,
				revision: updated.revision,
			});
			await context.commandJournal.record({
				commandId: command.commandId,
				commandName: "RevokeMembership",
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

export interface RevokeMembershipInput extends RevokeMembershipCommand {
	actorPrincipalId: string;
}

export interface RevokeMembershipDeps {
	unitOfWork: OrganizationUnitOfWork;
	commandJournal: CommandJournalRepository;
}
