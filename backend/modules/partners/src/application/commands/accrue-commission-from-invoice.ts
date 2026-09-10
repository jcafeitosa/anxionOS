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
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentByInvoiceId,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwPartnersError } from "../errors";

export interface AccrueCommissionFromInvoiceDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function accrueCommissionFromInvoice(
	deps: AccrueCommissionFromInvoiceDeps,
	input: AccrueCommissionFromInvoiceCommand,
): Promise<PartnersCommandResult> {
	const command = accrueCommissionFromInvoiceCommandSchema.parse(input);
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
	const replayByInvoice = await loadIdempotentByInvoiceId(
		deps.commandJournal,
		command.invoiceId,
	);
	if (replayByInvoice) return replayByInvoice;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const racedByCommand = await ctx.commandJournal.findByCommandId(
			command.commandId,
		);
		if (racedByCommand) {
			const parsed = parseCommandResultSnapshot(racedByCommand.responseSnapshot);
			return partnersCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const racedByInvoice = await ctx.commandJournal.findByInvoiceId(
			command.invoiceId,
		);
		if (racedByInvoice) {
			if (racedByInvoice.organizationId !== command.partnerOrganizationId) {
				throwPartnersError(
					"PTR_CROSS_TENANT",
					"invoice accrual organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(racedByInvoice.responseSnapshot);
			const result = partnersCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.partnerOrganizationId,
				commandName: "accrueCommissionFromInvoice",
				invoiceId: command.invoiceId,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const partner = await ctx.partners.findByReferredOrganization(
			command.referredOrganizationId,
			command.partnerOrganizationId,
		);
		if (!partner || partner.status !== "ACTIVE") {
			throwPartnersError("PTR_PARTNER_NOT_FOUND", "partner not found for referral");
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
				invoiceId: command.invoiceId,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const commissionAmount = calculateCommissionAmount(
			command.totalAmount,
			partner.commissionRate,
		);
		const accrualId = `ptr_acc_${randomUUID()}`;
		const accruedAt = command.issuedAt;
		const saved = await ctx.commissionAccruals.save({
			id: accrualId,
			partnerId: partner.id,
			partnerOrganizationId: command.partnerOrganizationId,
			referredOrganizationId: command.referredOrganizationId,
			invoiceId: command.invoiceId,
			invoiceTotalAmount: command.totalAmount,
			commissionRate: partner.commissionRate,
			commissionAmount,
			status: "ACCRUED",
			accruedAt,
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
				accruedAt,
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
			invoiceId: command.invoiceId,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
