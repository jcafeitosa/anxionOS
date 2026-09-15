import type {
	PartnersCommandResult,
	SettlePayoutCommand,
} from "@anxionos/contracts/partners";
import {
	partnersCommandResultSchema,
	settlePayoutCommandSchema,
} from "@anxionos/contracts/partners";
import { createPayoutSettledEvent } from "../../domain/events/partners-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	createPartnersCommandIntent,
	loadIdempotentCommandResult,
	loadPartnersCommandReplayBeforeValidation,
	toCommandResultSnapshot,
} from "../command-support";
import { throwPartnersError } from "../errors";

export interface SettlePayoutDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function settlePayout(
	deps: SettlePayoutDeps,
	input: SettlePayoutCommand,
): Promise<PartnersCommandResult> {
	const replayBeforeValidation =
		await loadPartnersCommandReplayBeforeValidation(
			deps.commandJournal,
			input.partnerOrganizationId,
			input.commandId,
			"settlePayout",
			input,
		);
	if (replayBeforeValidation) return replayBeforeValidation;
	const command = settlePayoutCommandSchema.parse(input);
	const intent = createPartnersCommandIntent("settlePayout", command);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.partnerOrganizationId,
		command.commandId,
		intent,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		await ctx.lockIdempotencyKey(
			`${command.partnerOrganizationId}:${command.commandId}`,
		);
		const raced = await loadIdempotentCommandResult(
			ctx.commandJournal,
			command.partnerOrganizationId,
			command.commandId,
			intent,
		);
		if (raced) return raced;
		const payout = await ctx.payouts.findByIdForUpdate(
			command.payoutId,
			command.partnerOrganizationId,
		);
		if (!payout) {
			throwPartnersError("PTR_PAYOUT_NOT_FOUND", "payout not found");
		}
		if (payout.status !== "PROCESSING") {
			throwPartnersError(
				"PTR_PAYOUT_NOT_PROCESSING",
				"payout is not in PROCESSING status",
			);
		}
		const settled = await ctx.payouts.update({
			...payout,
			status: "SETTLED",
			settledAt: command.settledAt,
			providerReference: command.providerReference,
		});
		await ctx.publishEvents([
			createPayoutSettledEvent({
				payoutId: settled.id,
				partnerId: settled.partnerId,
				organizationId: command.partnerOrganizationId,
				settledAmount: settled.requestedAmount,
				providerReference: command.providerReference,
				settledAt: command.settledAt,
			}),
		]);
		const result = partnersCommandResultSchema.parse({
			aggregateId: settled.id,
			revision: 1,
			partnerId: settled.partnerId,
			payoutId: settled.id,
			commissionAmount: settled.requestedAmount,
			payoutStatus: settled.status,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.partnerOrganizationId,
			commandName: "settlePayout",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
