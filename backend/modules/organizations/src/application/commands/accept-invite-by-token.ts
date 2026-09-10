import {
	acceptInviteByTokenCommandSchema,
	commandResultSchema,
	type AcceptInviteByTokenCommand,
	type CommandResult,
} from "@anxionos/contracts/organizations";
import { canTransitionMembershipStatus } from "../../domain/entities/membership";
import { createMembershipActivatedEvent } from "../../domain/events/organization-events";
import { MembershipRevisionConflictError } from "../../domain/errors/membership-errors";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { InviteTokenHasher } from "../../domain/ports/invite-token-hasher";
import type { MembershipRepository } from "../../domain/ports/membership-repository";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import { loadIdempotentCommandResult, toCommandResultSnapshot } from "../command-support";
import { parseCommandResultSnapshot, throwOrganizationError } from "../errors";
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
	const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
	if (replay) {
		return replay;
	}
	const tokenHash = deps.inviteTokenHasher.hash(command.token);
	const invitedMembership =
		await deps.membershipRepository.findInvitedByTokenHash(tokenHash);
	if (!invitedMembership) {
		throwOrganizationError(
			"ORG_AGENCY_NOT_FOUND",
			"Invite token is invalid or already consumed",
		);
	}
	return deps.unitOfWork.runInTransaction(
		buildAgencyTenantContext(
			invitedMembership.agencyId,
			input.sessionPrincipalId,
		),
		async (context) => {
		const raced = await context.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return parseCommandResultSnapshot(raced.responseSnapshot);
		}
		const membership =
			await context.membershipRepository.findInvitedByTokenHash(tokenHash);
		if (!membership) {
			throwOrganizationError("ORG_AGENCY_NOT_FOUND", "Invite token is invalid or already consumed");
		}
		if (membership.inviteExpiresAt && membership.inviteExpiresAt.getTime() <= Date.now()) {
			throwOrganizationError("ORG_INVITE_EXPIRED", "Invite token has expired");
		}
		if (
			!membership.inviteEmail ||
			membership.inviteEmail.toLowerCase() !== input.sessionEmail.toLowerCase()
		) {
			throwOrganizationError("ORG_INVITE_EMAIL_MISMATCH", "Session email does not match the invited email");
		}
		if (membership.status !== "invited") {
			throwOrganizationError("ORG_MEMBERSHIP_NOT_INVITED", `Membership ${membership.id} is not invited`);
		}
		if (
			!membership.inviteTokenHash ||
			!deps.inviteTokenHasher.verify(command.token, membership.inviteTokenHash)
		) {
			throwOrganizationError("ORG_AGENCY_NOT_FOUND", "Invite token is invalid or already consumed");
		}
		if (!canTransitionMembershipStatus(membership.status, "active")) {
			throwOrganizationError(
				"ORG_INVALID_STATUS_TRANSITION",
				`Cannot activate membership from status ${membership.status}`,
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
				inviteTokenHash: null,
				inviteExpiresAt: null,
				joinedAt: now,
				revision,
				updatedAt: now,
			});
		} catch (error) {
			if (error instanceof MembershipRevisionConflictError) {
				throwOrganizationError("ORG_AGENCY_NOT_FOUND", "Invite token is invalid or already consumed");
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
		await context.commandJournal.record({
			commandId: command.commandId,
			commandName: "AcceptInviteByToken",
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
