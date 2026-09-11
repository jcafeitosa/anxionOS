import {
	type AdvanceOnboardingCommand,
	advanceOnboardingCommandSchema,
	type CommandResult,
	commandResultSchema,
} from "@anxionos/contracts/organizations";
import { canTransitionOnboardingStep } from "../../domain/entities/agency";
import { createAgencyStatusChangedEvent } from "../../domain/events/organization-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import {
	hashCommandPayload,
	loadIdempotentCommandResult,
	recordOrganizationCommand,
	toCommandResultSnapshot,
} from "../command-support";
import { throwOrganizationError } from "../errors";
import { assertActorIsOwnerOrAdmin } from "../services/membership-role-guard";
import { buildAgencyTenantContext } from "../services/tenant-context";

export async function advanceOnboarding(
	deps: AdvanceOnboardingDeps,
	input: AdvanceOnboardingInput,
): Promise<CommandResult> {
	const command = advanceOnboardingCommandSchema.parse(input);
	const intent = {
		commandName: "AdvanceOnboarding",
		aggregateId: command.agencyId,
		requestHash: hashCommandPayload({
			agencyId: command.agencyId,
			step: command.step,
			actorPrincipalId: input.actorPrincipalId,
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
			const agency = await context.agencyRepository.findByAgencyId(
				command.agencyId,
			);
			if (!agency) {
				throwOrganizationError(
					"ORG_AGENCY_NOT_FOUND",
					`Agency ${command.agencyId} not found`,
				);
			}
			if (!canTransitionOnboardingStep(agency.onboardingStep, command.step)) {
				throwOrganizationError(
					"ORG_INVALID_STATUS_TRANSITION",
					`Cannot advance onboarding from ${agency.onboardingStep} to ${command.step}`,
				);
			}
			if (agency.onboardingStep === command.step) {
				const unchanged = commandResultSchema.parse({
					aggregateId: agency.id,
					revision: agency.revision,
				});
				await recordOrganizationCommand(context, {
					commandId: command.commandId,
					commandName: "AdvanceOnboarding",
					aggregateId: agency.id,
					aggregateType: "Agency",
					revision: agency.revision,
					responseSnapshot: toCommandResultSnapshot(unchanged),
					requestHash: intent.requestHash,
				});
				return unchanged;
			}
			const now = new Date();
			const revision = agency.revision + 1;
			const previousStatus = agency.status;
			const updated = await context.agencyRepository.save({
				...agency,
				onboardingStep: command.step,
				revision,
				updatedAt: now,
			});
			const result = commandResultSchema.parse({
				aggregateId: updated.id,
				revision: updated.revision,
			});
			const event = createAgencyStatusChangedEvent({
				agencyId: updated.id,
				status: updated.status,
				onboardingStep: updated.onboardingStep,
				previousStatus,
				revision: updated.revision,
			});
			await recordOrganizationCommand(context, {
				commandId: command.commandId,
				commandName: "AdvanceOnboarding",
				aggregateId: updated.id,
				aggregateType: "Agency",
				revision: updated.revision,
				responseSnapshot: toCommandResultSnapshot(result),
				requestHash: intent.requestHash,
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface AdvanceOnboardingInput extends AdvanceOnboardingCommand {
	actorPrincipalId: string;
}

export interface AdvanceOnboardingDeps {
	unitOfWork: OrganizationUnitOfWork;
	commandJournal: CommandJournalRepository;
}
