import type {
	BillingCommandResult,
	IssueInvoiceCommand,
} from "@anxionos/contracts/billing";
import {
	billingCommandResultSchema,
	issueInvoiceCommandSchema,
} from "@anxionos/contracts/billing";
import { createInvoiceIssuedEvent } from "../../domain/events/billing-events";
import type { BillingUnitOfWork } from "../../domain/ports/billing-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwBillingError } from "../errors";

export interface IssueInvoiceDeps {
	unitOfWork: BillingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function issueInvoice(
	deps: IssueInvoiceDeps,
	input: IssueInvoiceCommand,
): Promise<BillingCommandResult> {
	const command = issueInvoiceCommandSchema.parse(input);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwBillingError(
			"BIL_CROSS_TENANT",
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
			return billingCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const subscription = await ctx.subscriptions.findById(
			command.subscriptionId,
		);
		if (
			!subscription ||
			subscription.organizationId !== command.organizationId
		) {
			throwBillingError(
				"BIL_SUBSCRIPTION_NOT_FOUND",
				"subscription not found for organization",
			);
		}
		const invoice = command.invoiceId
			? await ctx.invoices.findById(command.invoiceId)
			: null;
		if (invoice && invoice.organizationId !== command.organizationId) {
			throwBillingError("BIL_CROSS_TENANT", "invoice organization mismatch");
		}
		if (!invoice) {
			throwBillingError("BIL_INVOICE_NOT_FOUND", "invoice not found");
		}
		if (invoice.subscriptionId !== command.subscriptionId) {
			throwBillingError(
				"BIL_INVOICE_NOT_FOUND",
				"invoice does not belong to subscription",
			);
		}
		if (invoice.status === "ISSUED") {
			const result = billingCommandResultSchema.parse({
				aggregateId: invoice.id,
				revision: 1,
				subscriptionId: invoice.subscriptionId,
				invoiceId: invoice.id,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "issueInvoice",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		if (invoice.status !== "DRAFT") {
			throwBillingError(
				"BIL_INVOICE_NOT_FOUND",
				"invoice is not in DRAFT status",
			);
		}
		const totalAmount = await ctx.invoiceLines.sumAmountByInvoice(invoice.id);
		const issuedAt = new Date().toISOString();
		const issued = await ctx.invoices.updateStatus(
			invoice.id,
			"ISSUED",
			issuedAt,
		);
		await ctx.publishEvents([
			createInvoiceIssuedEvent({
				invoiceId: issued.id,
				organizationId: issued.organizationId,
				subscriptionId: issued.subscriptionId,
				billingPeriod: issued.billingPeriod,
				totalAmount,
				issuedAt,
			}),
		]);
		const result = billingCommandResultSchema.parse({
			aggregateId: issued.id,
			revision: 1,
			subscriptionId: issued.subscriptionId,
			invoiceId: issued.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "issueInvoice",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
