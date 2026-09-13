import type {
	BillingCommandResult,
	ProcessRefundCommand,
} from "@anxionos/contracts/billing";
import {
	billingCommandResultSchema,
	processRefundCommandSchema,
} from "@anxionos/contracts/billing";
import {
	createInvoiceRefundedEvent,
	createRefundProcessedEvent,
} from "../../domain/events/billing-events";
import type { BillingUnitOfWork } from "../../domain/ports/billing-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	createBillingCommandIntent,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { throwBillingError } from "../errors";

export interface ProcessRefundDeps {
	unitOfWork: BillingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function processRefund(
	deps: ProcessRefundDeps,
	input: ProcessRefundCommand,
): Promise<BillingCommandResult> {
	const command = processRefundCommandSchema.parse(input);
	const intent = createBillingCommandIntent("processRefund", command);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.organizationId,
		command.commandId,
		intent,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		await ctx.lockIdempotencyKey(
			`${command.organizationId}:${command.commandId}`,
		);
		const raced = await loadIdempotentCommandResult(
			ctx.commandJournal,
			command.organizationId,
			command.commandId,
			intent,
		);
		if (raced) return raced;
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
		const invoice = await ctx.invoices.findById(command.invoiceId);
		if (!invoice || invoice.organizationId !== command.organizationId) {
			throwBillingError("BIL_INVOICE_NOT_FOUND", "invoice not found");
		}
		if (invoice.subscriptionId !== command.subscriptionId) {
			throwBillingError(
				"BIL_INVOICE_NOT_FOUND",
				"invoice does not belong to subscription",
			);
		}
		if (invoice.status === "REFUNDED") {
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
				commandName: "processRefund",
				requestHash: intent.requestHash,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		if (invoice.status !== "ISSUED" && invoice.status !== "PAID") {
			throwBillingError(
				"BIL_INVOICE_NOT_ISSUED",
				"invoice must be ISSUED before refund",
			);
		}
		const refunded = await ctx.invoices.updateStatus(
			invoice.id,
			"REFUNDED",
			invoice.issuedAt,
		);
		await ctx.publishEvents([
			createInvoiceRefundedEvent({
				invoiceId: refunded.id,
				refundId: command.commandId,
				organizationId: refunded.organizationId,
				subscriptionId: refunded.subscriptionId,
				refundAmount: command.refundAmount,
				refundedAt: command.refundedAt,
				reason: command.reason,
			}),
			createRefundProcessedEvent({
				refundId: command.commandId,
				invoiceId: refunded.id,
				organizationId: refunded.organizationId,
				subscriptionId: refunded.subscriptionId,
				refundAmount: command.refundAmount,
				refundedAt: command.refundedAt,
				reason: command.reason,
			}),
		]);
		const result = billingCommandResultSchema.parse({
			aggregateId: refunded.id,
			revision: 1,
			subscriptionId: refunded.subscriptionId,
			invoiceId: refunded.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "processRefund",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
