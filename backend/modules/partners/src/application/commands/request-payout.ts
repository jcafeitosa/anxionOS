import { randomUUID } from "node:crypto";
import type {
	PartnersCommandResult,
	RequestPayoutCommand,
} from "@anxionos/contracts/partners";
import {
	partnersCommandResultSchema,
	requestPayoutCommandSchema,
} from "@anxionos/contracts/partners";
import { sumDecimalAmounts } from "../../domain/commission";
import { createPayoutScheduledEvent } from "../../domain/events/partners-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	createPartnersCommandIntent,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { throwPartnersError } from "../errors";

export interface RequestPayoutDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function requestPayout(
	deps: RequestPayoutDeps,
	input: RequestPayoutCommand,
): Promise<PartnersCommandResult> {
	const command = requestPayoutCommandSchema.parse(input);
	const intent = createPartnersCommandIntent("requestPayout", command);
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
		const partner = await ctx.partners.findById(
			command.partnerId,
			command.partnerOrganizationId,
		);
		if (!partner || partner.status !== "ACTIVE") {
			throwPartnersError("PTR_PARTNER_NOT_FOUND", "partner not found");
		}
		const accrued = await ctx.commissionAccruals.listAccruedByPartner(
			partner.id,
			command.partnerOrganizationId,
		);
		const requestedAmount = sumDecimalAmounts(
			accrued.map((row) => row.commissionAmount),
		);
		if (Number.parseFloat(requestedAmount) <= 0) {
			throwPartnersError(
				"PTR_INSUFFICIENT_ACCRUAL",
				"no accrued commission available for payout",
			);
		}
		const payoutId = `ptr_pay_${randomUUID()}`;
		const saved = await ctx.payouts.save({
			id: payoutId,
			partnerId: partner.id,
			partnerOrganizationId: command.partnerOrganizationId,
			requestedAmount,
			status: "SCHEDULED",
			requestedAt: command.requestedAt,
			approvedAt: null,
			approvalReference: null,
			processingAt: null,
			settledAt: null,
			failedAt: null,
			failureReason: null,
			providerReference: null,
			reversalReference: null,
			reversedAt: null,
			attemptCount: 0,
		});
		await ctx.publishEvents([
			createPayoutScheduledEvent({
				payoutId: saved.id,
				partnerId: partner.id,
				organizationId: command.partnerOrganizationId,
				requestedAmount,
				requestedAt: command.requestedAt,
			}),
		]);
		const result = partnersCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			partnerId: partner.id,
			payoutId: saved.id,
			commissionAmount: requestedAmount,
			payoutStatus: saved.status,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.partnerOrganizationId,
			commandName: "requestPayout",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
