import type {
	FailPayoutCommand,
	PartnersCommandResult,
} from "@anxionos/contracts/partners";
import {
	failPayoutCommandSchema,
	partnersCommandResultSchema,
} from "@anxionos/contracts/partners";
import { createPayoutFailedEvent } from "../../domain/events/partners-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	createPartnersCommandIntent,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { throwPartnersError } from "../errors";

export interface FailPayoutDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function failPayout(
	deps: FailPayoutDeps,
	input: FailPayoutCommand,
): Promise<PartnersCommandResult> {
	const command = failPayoutCommandSchema.parse(input);
	const intent = createPartnersCommandIntent("failPayout", command);
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
		const failed = await ctx.payouts.update({
			...payout,
			status: "FAILED",
			failedAt: command.failedAt,
			failureReason: command.failureReason,
		});
		await ctx.publishEvents([
			createPayoutFailedEvent({
				payoutId: failed.id,
				partnerId: failed.partnerId,
				organizationId: command.partnerOrganizationId,
				failureReason: command.failureReason,
				attemptNumber: failed.attemptCount,
				failedAt: command.failedAt,
			}),
		]);
		const result = partnersCommandResultSchema.parse({
			aggregateId: failed.id,
			revision: 1,
			partnerId: failed.partnerId,
			payoutId: failed.id,
			commissionAmount: failed.requestedAmount,
			payoutStatus: failed.status,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.partnerOrganizationId,
			commandName: "failPayout",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
