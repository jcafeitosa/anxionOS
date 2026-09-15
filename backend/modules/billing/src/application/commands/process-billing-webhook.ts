import type {
	BillingCommandResult,
	ProcessBillingWebhookCommand,
} from "@anxionos/contracts/billing";
import {
	billingCommandResultSchema,
	processBillingWebhookCommandSchema,
} from "@anxionos/contracts/billing";
import {
	createInvoicePaidEvent,
	createSubscriptionCancelledEvent,
	createWebhookProcessedEvent,
} from "../../domain/events/billing-events";
import type { BillingUnitOfWork } from "../../domain/ports/billing-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	createBillingCommandIntent,
	loadIdempotentByWebhookEventId,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { throwBillingError } from "../errors";

export interface ProcessBillingWebhookDeps {
	unitOfWork: BillingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function processBillingWebhook(
	deps: ProcessBillingWebhookDeps,
	input: ProcessBillingWebhookCommand,
): Promise<BillingCommandResult> {
	const command = processBillingWebhookCommandSchema.parse(input);
	const intent = createBillingCommandIntent("processBillingWebhook", command);
	const replayByWebhook = await loadIdempotentByWebhookEventId(
		deps.commandJournal,
		command.organizationId,
		command.webhookEventId,
		intent,
	);
	if (replayByWebhook) return replayByWebhook;
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.organizationId,
		command.commandId,
		intent,
	);
	if (replay) return replay;
	if (
		command.eventType === "subscription.cancelled" &&
		!command.subscriptionId
	) {
		throwBillingError(
			"BIL_INVALID_WEBHOOK",
			"subscription.cancelled requires subscriptionId",
		);
	}
	if (
		(command.eventType === "invoice.payment_succeeded" ||
			command.eventType === "invoice.payment_failed") &&
		!command.invoiceId
	) {
		throwBillingError(
			"BIL_INVALID_WEBHOOK",
			"invoice webhook requires invoiceId",
		);
	}
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		await ctx.lockIdempotencyKey(
			`${command.organizationId}:webhook:${command.webhookEventId}`,
		);
		await ctx.lockIdempotencyKey(
			`${command.organizationId}:${command.commandId}`,
		);
		const racedByWebhook = await loadIdempotentByWebhookEventId(
			ctx.commandJournal,
			command.organizationId,
			command.webhookEventId,
			intent,
		);
		if (racedByWebhook) return racedByWebhook;
		const raced = await loadIdempotentCommandResult(
			ctx.commandJournal,
			command.organizationId,
			command.commandId,
			intent,
		);
		if (raced) return raced;
		if (
			command.eventType === "subscription.cancelled" &&
			command.subscriptionId
		) {
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
			if (subscription.status !== "CANCELLED") {
				await ctx.subscriptions.updateStatus(subscription.id, "CANCELLED");
				await ctx.publishEvents([
					createSubscriptionCancelledEvent({
						subscriptionId: subscription.id,
						organizationId: subscription.organizationId,
						cancelledAt: command.occurredAt,
						reason: "webhook:subscription.cancelled",
					}),
				]);
			}
		}
		if (
			command.eventType === "invoice.payment_succeeded" &&
			command.invoiceId
		) {
			const invoice = await ctx.invoices.findById(command.invoiceId);
			if (!invoice || invoice.organizationId !== command.organizationId) {
				throwBillingError(
					"BIL_INVOICE_NOT_FOUND",
					"invoice not found for organization",
				);
			}
			if (invoice.status !== "ISSUED" && invoice.status !== "PAID") {
				throwBillingError(
					"BIL_INVOICE_NOT_ISSUED",
					"invoice must be ISSUED before payment",
				);
			}
			const paid =
				invoice.status === "PAID"
					? invoice
					: await ctx.invoices.updateStatus(
							invoice.id,
							"PAID",
							invoice.issuedAt,
						);
			await ctx.publishEvents([
				createInvoicePaidEvent({
					invoiceId: paid.id,
					organizationId: paid.organizationId,
					subscriptionId: paid.subscriptionId,
					billingPeriod: paid.billingPeriod,
					totalAmount: paid.totalAmount,
					paidAt: command.occurredAt,
				}),
			]);
		}
		const aggregateId =
			command.invoiceId ?? command.subscriptionId ?? command.webhookEventId;
		const result = billingCommandResultSchema.parse({
			aggregateId,
			revision: 1,
			subscriptionId: command.subscriptionId,
			invoiceId: command.invoiceId,
		});
		await ctx.publishEvents([
			createWebhookProcessedEvent({
				webhookEventId: command.webhookEventId,
				organizationId: command.organizationId,
				eventType: command.eventType,
				occurredAt: command.occurredAt,
			}),
		]);
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "processBillingWebhook",
			requestHash: intent.requestHash,
			webhookEventId: command.webhookEventId,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
