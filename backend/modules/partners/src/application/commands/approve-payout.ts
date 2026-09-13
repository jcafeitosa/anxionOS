import type {
	ApprovePayoutCommand,
	PartnersCommandResult,
} from "@anxionos/contracts/partners";
import {
	approvePayoutCommandSchema,
	partnersCommandResultSchema,
} from "@anxionos/contracts/partners";
import { createPayoutApprovedEvent } from "../../domain/events/partners-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	createPartnersCommandIntent,
	loadIdempotentCommandResult,
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
		const payout = await ctx.payouts.findById(
			command.payoutId,
			command.partnerOrganizationId,
		);
		if (!payout) {
			throwPartnersError("PTR_PAYOUT_NOT_FOUND", "payout not found");
		}
		if (payout.status === "APPROVED") {
			const result = partnersCommandResultSchema.parse({
				aggregateId: payout.id,
				revision: 1,
				partnerId: payout.partnerId,
				payoutId: payout.id,
				commissionAmount: payout.requestedAmount,
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
		if (payout.status !== "REQUESTED") {
			throwPartnersError(
				"PTR_PAYOUT_NOT_REQUESTED",
				"payout is not in REQUESTED status",
			);
		}
		const approved = await ctx.payouts.update({
			...payout,
			status: "APPROVED",
			approvedAt: command.approvedAt,
			approvalReference: command.approvalReference,
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
			createPayoutApprovedEvent({
				payoutId: approved.id,
				partnerId: approved.partnerId,
				organizationId: command.partnerOrganizationId,
				approvedAmount: approved.requestedAmount,
				approvalReference: command.approvalReference,
				approvedAt: command.approvedAt,
			}),
		]);
		const result = partnersCommandResultSchema.parse({
			aggregateId: approved.id,
			revision: 1,
			partnerId: approved.partnerId,
			payoutId: approved.id,
			commissionAmount: approved.requestedAmount,
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
