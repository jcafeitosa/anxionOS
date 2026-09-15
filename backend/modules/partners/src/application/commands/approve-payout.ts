import type {
	ApprovePayoutCommand,
	PartnersCommandResult,
} from "@anxionos/contracts/partners";
import {
	approvePayoutCommandSchema,
	partnersCommandResultSchema,
} from "@anxionos/contracts/partners";
import { createPayoutProcessingEvent } from "../../domain/events/partners-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	createPartnersCommandIntent,
	loadIdempotentCommandResult,
	loadPartnersCommandReplayBeforeValidation,
	toCommandResultSnapshot,
} from "../command-support";
import { throwPartnersError } from "../errors";

export interface ApprovePayoutDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function approvePayout(
	deps: ApprovePayoutDeps,
	input: ApprovePayoutCommand,
): Promise<PartnersCommandResult> {
	const replayBeforeValidation =
		await loadPartnersCommandReplayBeforeValidation(
			deps.commandJournal,
			input.partnerOrganizationId,
			input.commandId,
			"approvePayout",
			input,
		);
	if (replayBeforeValidation) return replayBeforeValidation;
	const command = approvePayoutCommandSchema.parse(input);
	const intent = createPartnersCommandIntent("approvePayout", command);
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
		if (payout.status === "PROCESSING") {
			const result = partnersCommandResultSchema.parse({
				aggregateId: payout.id,
				revision: 1,
				partnerId: payout.partnerId,
				payoutId: payout.id,
				commissionAmount: payout.requestedAmount,
				payoutStatus: payout.status,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.partnerOrganizationId,
				commandName: "approvePayout",
				requestHash: intent.requestHash,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		if (payout.status !== "SCHEDULED") {
			throwPartnersError(
				"PTR_PAYOUT_NOT_SCHEDULED",
				"payout is not in SCHEDULED status",
			);
		}
		const approved = await ctx.payouts.update({
			...payout,
			status: "PROCESSING",
			approvedAt: command.approvedAt,
			approvalReference: command.approvalReference,
			processingAt: command.approvedAt,
			attemptCount: payout.attemptCount + 1,
		});
		const accrued = await ctx.commissionAccruals.listAccruedByPartner(
			payout.partnerId,
			command.partnerOrganizationId,
		);
		for (const row of accrued) {
			await ctx.commissionAccruals.update({
				...row,
				status: "PAID",
			});
		}
		await ctx.publishEvents([
			createPayoutProcessingEvent({
				payoutId: approved.id,
				partnerId: approved.partnerId,
				organizationId: command.partnerOrganizationId,
				processingAt: command.approvedAt,
				attemptNumber: approved.attemptCount,
			}),
		]);
		const result = partnersCommandResultSchema.parse({
			aggregateId: approved.id,
			revision: 1,
			partnerId: approved.partnerId,
			payoutId: approved.id,
			commissionAmount: approved.requestedAmount,
			payoutStatus: approved.status,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.partnerOrganizationId,
			commandName: "approvePayout",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
