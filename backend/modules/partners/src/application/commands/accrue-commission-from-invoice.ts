import { randomUUID } from "node:crypto";
import type {
	AccrueCommissionFromInvoiceCommand,
	PartnersCommandResult,
} from "@anxionos/contracts/partners";
import {
	accrueCommissionFromInvoiceCommandSchema,
	partnersCommandResultSchema,
} from "@anxionos/contracts/partners";
import { calculateCommissionAmount } from "../../domain/commission";
import { createCommissionAccruedEvent } from "../../domain/events/partners-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	createPartnersCommandIntent,
	loadIdempotentByInvoiceId,
	loadIdempotentCommandResult,
	loadPartnersCommandReplayBeforeValidation,
	toCommandResultSnapshot,
} from "../command-support";
import { throwPartnersError } from "../errors";

export interface AccrueCommissionFromInvoiceDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function accrueCommissionFromInvoice(
	deps: AccrueCommissionFromInvoiceDeps,
	input: AccrueCommissionFromInvoiceCommand,
): Promise<PartnersCommandResult> {
	const replayBeforeValidation =
		await loadPartnersCommandReplayBeforeValidation(
			deps.commandJournal,
			input.partnerOrganizationId,
			input.commandId,
			"accrueCommissionFromInvoice",
			input,
		);
	if (replayBeforeValidation) return replayBeforeValidation;
	const command = accrueCommissionFromInvoiceCommandSchema.parse(input);
	const intent = createPartnersCommandIntent(
		"accrueCommissionFromInvoice",
		command,
	);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.partnerOrganizationId,
		command.commandId,
		intent,
	);
	if (replay) return replay;
	const replayByInvoice = await loadIdempotentByInvoiceId(
		deps.commandJournal,
		command.partnerOrganizationId,
		command.invoiceId,
		intent,
	);
	if (replayByInvoice) return replayByInvoice;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		await ctx.lockIdempotencyKey(
			`${command.partnerOrganizationId}:${command.commandId}`,
		);
		await ctx.lockIdempotencyKey(
			`${command.partnerOrganizationId}:invoice:${command.invoiceId}`,
		);
		const racedByCommand = await loadIdempotentCommandResult(
			ctx.commandJournal,
			command.partnerOrganizationId,
			command.commandId,
			intent,
		);
		if (racedByCommand) return racedByCommand;
		const racedByInvoice = await loadIdempotentByInvoiceId(
			ctx.commandJournal,
			command.partnerOrganizationId,
			command.invoiceId,
			intent,
		);
		if (racedByInvoice) return racedByInvoice;
		const partner = await ctx.partners.findByReferredOrganization(
			command.referredOrganizationId,
			command.partnerOrganizationId,
		);
		if (!partner || partner.status !== "ACTIVE") {
			throwPartnersError(
				"PTR_PARTNER_NOT_FOUND",
				"partner not found for referral",
			);
		}
		const existingAccrual = await ctx.commissionAccruals.findByInvoiceId(
			command.invoiceId,
			command.partnerOrganizationId,
		);
		if (existingAccrual) {
			const result = partnersCommandResultSchema.parse({
				aggregateId: existingAccrual.id,
				revision: 1,
				partnerId: existingAccrual.partnerId,
				referralId: partner.referralCode,
				commissionAccrualId: existingAccrual.id,
				commissionAmount: existingAccrual.commissionAmount,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.partnerOrganizationId,
				commandName: "accrueCommissionFromInvoice",
				requestHash: intent.requestHash,
				invoiceId: command.invoiceId,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const commissionAmount = calculateCommissionAmount(
			command.totalAmount,
			partner.commissionRate,
		);
		const saved = await ctx.commissionAccruals.save({
			id: `ptr_acc_${randomUUID()}`,
			partnerId: partner.id,
			partnerOrganizationId: command.partnerOrganizationId,
			referredOrganizationId: command.referredOrganizationId,
			invoiceId: command.invoiceId,
			invoiceTotalAmount: command.totalAmount,
			commissionRate: partner.commissionRate,
			commissionAmount,
			status: "ACCRUED",
			accruedAt: command.paidAt,
			reversedAt: null,
		});
		await ctx.publishEvents([
			createCommissionAccruedEvent({
				commissionAccrualId: saved.id,
				partnerId: partner.id,
				organizationId: command.partnerOrganizationId,
				referralId: partner.referralCode,
				referredOrganizationId: command.referredOrganizationId,
				invoiceId: command.invoiceId,
				invoiceTotalAmount: command.totalAmount,
				commissionRate: partner.commissionRate,
				commissionAmount,
				accruedAt: command.paidAt,
			}),
		]);
		const result = partnersCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			partnerId: partner.id,
			referralId: partner.referralCode,
			commissionAccrualId: saved.id,
			commissionAmount,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.partnerOrganizationId,
			commandName: "accrueCommissionFromInvoice",
			requestHash: intent.requestHash,
			invoiceId: command.invoiceId,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
