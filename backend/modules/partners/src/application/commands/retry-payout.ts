import type {
	PartnersCommandResult,
	RetryPayoutCommand,
} from "@anxionos/contracts/partners";
import {
	partnersCommandResultSchema,
	retryPayoutCommandSchema,
} from "@anxionos/contracts/partners";
import { createPayoutProcessingEvent } from "../../domain/events/partners-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	createPartnersCommandIntent,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { throwPartnersError } from "../errors";

export interface RetryPayoutDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function retryPayout(
	deps: RetryPayoutDeps,
	input: RetryPayoutCommand,
): Promise<PartnersCommandResult> {
	const command = retryPayoutCommandSchema.parse(input);
	const intent = createPartnersCommandIntent("retryPayout", command);
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
		if (payout.status !== "FAILED") {
			throwPartnersError(
				"PTR_PAYOUT_NOT_FAILED",
				"payout is not in FAILED status",
			);
		}
		const retried = await ctx.payouts.update({
			...payout,
			status: "PROCESSING",
			processingAt: command.processingAt,
			failedAt: null,
			failureReason: null,
			attemptCount: payout.attemptCount + 1,
		});
		await ctx.publishEvents([
			createPayoutProcessingEvent({
				payoutId: retried.id,
				partnerId: retried.partnerId,
				organizationId: command.partnerOrganizationId,
				processingAt: command.processingAt,
				attemptNumber: retried.attemptCount,
			}),
		]);
		const result = partnersCommandResultSchema.parse({
			aggregateId: retried.id,
			revision: 1,
			partnerId: retried.partnerId,
			payoutId: retried.id,
			commissionAmount: retried.requestedAmount,
			payoutStatus: retried.status,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.partnerOrganizationId,
			commandName: "retryPayout",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
