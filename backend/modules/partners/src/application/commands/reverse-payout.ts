import type {
	PartnersCommandResult,
	ReversePayoutCommand,
} from "@anxionos/contracts/partners";
import {
	partnersCommandResultSchema,
	reversePayoutCommandSchema,
} from "@anxionos/contracts/partners";
import { createPayoutReversedEvent } from "../../domain/events/partners-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	createPartnersCommandIntent,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { throwPartnersError } from "../errors";

export interface ReversePayoutDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function reversePayout(
	deps: ReversePayoutDeps,
	input: ReversePayoutCommand,
): Promise<PartnersCommandResult> {
	const command = reversePayoutCommandSchema.parse(input);
	const intent = createPartnersCommandIntent("reversePayout", command);
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
		if (payout.status !== "SETTLED") {
			throwPartnersError(
				"PTR_PAYOUT_NOT_SETTLED",
				"payout is not in SETTLED status",
			);
		}
		const reversed = await ctx.payouts.update({
			...payout,
			status: "REVERSED",
			reversedAt: command.reversedAt,
			reversalReference: command.reversalReference,
		});
		await ctx.publishEvents([
			createPayoutReversedEvent({
				payoutId: reversed.id,
				partnerId: reversed.partnerId,
				organizationId: command.partnerOrganizationId,
				reversalReference: command.reversalReference,
				reversedAt: command.reversedAt,
			}),
		]);
		const result = partnersCommandResultSchema.parse({
			aggregateId: reversed.id,
			revision: 1,
			partnerId: reversed.partnerId,
			payoutId: reversed.id,
			commissionAmount: reversed.requestedAmount,
			payoutStatus: reversed.status,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.partnerOrganizationId,
			commandName: "reversePayout",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
