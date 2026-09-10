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
import { createPayoutRequestedEvent } from "../../domain/events/partners-events";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwPartnersError } from "../errors";

export interface RequestPayoutDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function requestPayout(
	deps: RequestPayoutDeps,
	input: RequestPayoutCommand,
): Promise<PartnersCommandResult> {
	const command = requestPayoutCommandSchema.parse(input);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.partnerOrganizationId
	) {
		throwPartnersError(
			"PTR_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return partnersCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
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
			status: "REQUESTED",
			requestedAt: command.requestedAt,
			approvedAt: null,
			approvalReference: null,
		});
		await ctx.publishEvents([
			createPayoutRequestedEvent({
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
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.partnerOrganizationId,
			commandName: "requestPayout",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
