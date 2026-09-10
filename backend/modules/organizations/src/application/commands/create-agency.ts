import { randomUUID } from "node:crypto";
import {
	commandResultSchema,
	createAgencyCommandSchema,
	type CommandResult,
	type CreateAgencyCommand,
} from "@anxionos/contracts/organizations";
import { createAgencyCreatedEvent } from "../../domain/events/organization-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import { loadIdempotentCommandResult, toCommandResultSnapshot } from "../command-support";
import { parseCommandResultSnapshot } from "../errors";
import { assertPrincipalExists } from "../services/principal-guard";
import { buildAgencyTenantContext } from "../services/tenant-context";

export async function createAgency(
	deps: CreateAgencyDeps,
	input: CreateAgencyInput,
): Promise<CommandResult> {
	const command = createAgencyCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
	if (replay) {
		return replay;
	}
	await assertPrincipalExists(deps.principalLookup, input.ownerPrincipalId);
	const agencyId = randomUUID();
	const ownerId = randomUUID();
	const membershipId = randomUUID();
	const now = new Date();
	const revision = 1;
	const result = commandResultSchema.parse({
		aggregateId: agencyId,
		revision,
	});
	const event = createAgencyCreatedEvent({
		agencyId,
		ownerPrincipalId: input.ownerPrincipalId,
		displayName: command.displayName,
		marketScope: command.marketScope,
		status: "draft",
		onboardingStep: "created",
		revision,
	});
	return deps.unitOfWork.runInTransaction(
		buildAgencyTenantContext(agencyId, input.ownerPrincipalId),
		async (context) => {
		const raced = await context.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return parseCommandResultSnapshot(raced.responseSnapshot);
		}
		await context.agencyRepository.save({
			id: agencyId,
			ownerPrincipalId: input.ownerPrincipalId,
			displayName: command.displayName,
			marketScope: command.marketScope,
			status: "draft",
			onboardingStep: "created",
			revision,
			createdAt: now,
			updatedAt: now,
		});
		const existingOwner = await context.ownerRepository.findByPrincipalId(input.ownerPrincipalId);
		if (!existingOwner) {
			await context.ownerRepository.save({
				id: ownerId,
				principalId: input.ownerPrincipalId,
				defaultOrganizationId: agencyId,
				createdAt: now,
			});
		}
		await context.membershipRepository.save({
			id: membershipId,
			agencyId,
			principalId: input.ownerPrincipalId,
			inviteEmail: null,
			inviteTokenHash: null,
			inviteExpiresAt: null,
			role: "owner",
			status: "active",
			invitedAt: null,
			joinedAt: now,
			revokedAt: null,
			revision: 1,
			createdAt: now,
			updatedAt: now,
		});
		await context.commandJournal.record({
			commandId: command.commandId,
			commandName: "CreateAgency",
			aggregateId: agencyId,
			aggregateType: "Agency",
			revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents([event]);
		return result;
		},
	);
}

export interface CreateAgencyInput extends CreateAgencyCommand {
	ownerPrincipalId: string;
}

export interface CreateAgencyDeps {
	unitOfWork: OrganizationUnitOfWork;
	commandJournal: CommandJournalRepository;
	principalLookup: PrincipalLookup;
}
