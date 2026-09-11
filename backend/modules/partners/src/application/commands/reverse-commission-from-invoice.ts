import type {
	PartnersCommandResult,
	ReverseCommissionFromInvoiceCommand,
} from "@anxionos/contracts/partners";
import {
	partnersCommandResultSchema,
	reverseCommissionFromInvoiceCommandSchema,
} from "@anxionos/contracts/partners";
import { createCommissionReversedEvent } from "../../domain/events/partners-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwPartnersError } from "../errors";

export interface ReverseCommissionFromInvoiceDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function reverseCommissionFromInvoice(
	deps: ReverseCommissionFromInvoiceDeps,
	input: ReverseCommissionFromInvoiceCommand,
): Promise<PartnersCommandResult> {
	const command = reverseCommissionFromInvoiceCommandSchema.parse(input);
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
		const accrual = await ctx.commissionAccruals.findByInvoiceId(
			command.invoiceId,
			command.partnerOrganizationId,
		);
		if (!accrual) {
			throwPartnersError(
				"PTR_ACCRUAL_NOT_FOUND",
				"commission accrual not found for invoice",
			);
		}
		if (accrual.status === "REVERSED") {
			const result = partnersCommandResultSchema.parse({
				aggregateId: accrual.id,
				revision: 1,
				partnerId: accrual.partnerId,
				commissionAccrualId: accrual.id,
				commissionAmount: accrual.commissionAmount,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.partnerOrganizationId,
				commandName: "reverseCommissionFromInvoice",
				invoiceId: command.invoiceId,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		if (accrual.status !== "ACCRUED") {
			throwPartnersError(
				"PTR_ACCRUAL_NOT_FOUND",
				"commission accrual cannot be reversed",
			);
		}
		const reversed = await ctx.commissionAccruals.update({
			...accrual,
			status: "REVERSED",
			reversedAt: command.reversedAt,
		});
		await ctx.publishEvents([
			createCommissionReversedEvent({
				commissionAccrualId: reversed.id,
				partnerId: reversed.partnerId,
				organizationId: command.partnerOrganizationId,
				invoiceId: command.invoiceId,
				reversedAmount: reversed.commissionAmount,
				reversedAt: command.reversedAt,
			}),
		]);
		const result = partnersCommandResultSchema.parse({
			aggregateId: reversed.id,
			revision: 1,
			partnerId: reversed.partnerId,
			commissionAccrualId: reversed.id,
			commissionAmount: reversed.commissionAmount,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.partnerOrganizationId,
			commandName: "reverseCommissionFromInvoice",
			invoiceId: command.invoiceId,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
