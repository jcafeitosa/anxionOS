import { randomBytes, randomUUID } from "node:crypto";
import {
	commandResultSchema,
	inviteMemberCommandSchema,
	type CommandResult,
	type InviteMemberCommand,
} from "@anxionos/contracts/organizations";
import { createMembershipInvitedEvent } from "../../domain/events/organization-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { InviteTokenHasher } from "../../domain/ports/invite-token-hasher";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import { loadIdempotentCommandResult, toCommandResultSnapshot } from "../command-support";
import { parseCommandResultSnapshot, throwOrganizationError } from "../errors";
import { INVITE_TTL_MS } from "../invite-constants";
import { assertActorIsOwnerOrAdmin } from "../services/membership-role-guard";

export async function inviteMember(
	deps: InviteMemberDeps,
	input: InviteMemberInput,
): Promise<InviteMemberResult> {
	const command = inviteMemberCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
	if (replay) {
		return { result: replay, inviteToken: "" };
	}
	return deps.unitOfWork.runInTransaction(async (context) => {
		const raced = await context.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return {
				result: parseCommandResultSnapshot(raced.responseSnapshot),
				inviteToken: "",
			};
		}
		await assertActorIsOwnerOrAdmin(context.membershipRepository, input.actorPrincipalId, command.agencyId);
		const agency = await context.agencyRepository.findByAgencyId(command.agencyId);
		if (!agency) {
			throwOrganizationError("ORG_AGENCY_NOT_FOUND", `Agency ${command.agencyId} not found`);
		}
		const existingInvite = await context.membershipRepository.findInvitedByAgencyAndEmail(
			command.agencyId,
			command.email,
		);
		if (existingInvite) {
			throwOrganizationError(
				"ORG_MEMBERSHIP_EXISTS",
				`Pending invite already exists for ${command.email} in agency ${command.agencyId}`,
			);
		}
		const membershipId = randomUUID();
		const inviteToken = randomBytes(32).toString("base64url");
		const inviteTokenHash = deps.inviteTokenHasher.hash(inviteToken);
		const now = new Date();
		const inviteExpiresAt = new Date(now.getTime() + INVITE_TTL_MS);
		const revision = 1;
		await context.membershipRepository.save({
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
		});
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
		await context.commandJournal.record({
			commandId: command.commandId,
			commandName: "InviteMember",
			aggregateId: membershipId,
			aggregateType: "Membership",
			revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents([event]);
		return { result, inviteToken };
	});
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
