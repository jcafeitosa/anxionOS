import {
	commandResultSchema,
	updateAgencyMarketsCommandSchema,
	type CommandResult,
	type UpdateAgencyMarketsCommand,
} from "@anxionos/contracts/organizations";
import { createAgencyMarketsUpdatedEvent } from "../../domain/events/organization-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import { loadIdempotentCommandResult, toCommandResultSnapshot } from "../command-support";
import { parseCommandResultSnapshot, throwOrganizationError } from "../errors";
import { assertActorIsOwnerOrAdmin } from "../services/membership-role-guard";
import { buildAgencyTenantContext } from "../services/tenant-context";

export async function updateAgencyMarkets(
	deps: UpdateAgencyMarketsDeps,
	input: UpdateAgencyMarketsInput,
): Promise<CommandResult> {
	const command = updateAgencyMarketsCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
	if (replay) {
		return replay;
	}
	return deps.unitOfWork.runInTransaction(
		buildAgencyTenantContext(command.agencyId, input.actorPrincipalId),
		async (context) => {
		const raced = await context.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return parseCommandResultSnapshot(raced.responseSnapshot);
		}
		await assertActorIsOwnerOrAdmin(context.membershipRepository, input.actorPrincipalId, command.agencyId);
		const agency = await context.agencyRepository.findByAgencyId(command.agencyId);
		if (!agency) {
			throwOrganizationError("ORG_AGENCY_NOT_FOUND", `Agency ${command.agencyId} not found`);
		}
		if (agency.marketScope === command.marketScope) {
			const unchanged = commandResultSchema.parse({
				aggregateId: agency.id,
				revision: agency.revision,
			});
			await context.commandJournal.record({
				commandId: command.commandId,
				commandName: "UpdateAgencyMarkets",
				aggregateId: agency.id,
				aggregateType: "Agency",
				revision: agency.revision,
				responseSnapshot: toCommandResultSnapshot(unchanged),
			});
			return unchanged;
		}
		const now = new Date();
		const revision = agency.revision + 1;
		const onboardingStep = agency.onboardingStep === "created" ? "markets_set" : agency.onboardingStep;
		const updated = await context.agencyRepository.save({
			...agency,
			marketScope: command.marketScope,
			onboardingStep,
			revision,
			updatedAt: now,
		});
		const result = commandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
		});
		const event = createAgencyMarketsUpdatedEvent({
			agencyId: updated.id,
			marketScope: updated.marketScope,
			previousMarketScope: agency.marketScope,
			revision: updated.revision,
		});
		await context.commandJournal.record({
			commandId: command.commandId,
			commandName: "UpdateAgencyMarkets",
			aggregateId: updated.id,
			aggregateType: "Agency",
			revision: updated.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents([event]);
		return result;
		},
	);
}

export interface UpdateAgencyMarketsInput extends UpdateAgencyMarketsCommand {
	actorPrincipalId: string;
}

export interface UpdateAgencyMarketsDeps {
	unitOfWork: OrganizationUnitOfWork;
	commandJournal: CommandJournalRepository;
}
