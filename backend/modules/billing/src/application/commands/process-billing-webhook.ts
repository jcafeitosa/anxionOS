import type {
	BillingCommandResult,
	ProcessBillingWebhookCommand,
} from "@anxionos/contracts/billing";
import {
	billingCommandResultSchema,
	processBillingWebhookCommandSchema,
} from "@anxionos/contracts/billing";
import {
	createSubscriptionCancelledEvent,
	createWebhookProcessedEvent,
} from "../../domain/events/billing-events";
import type { BillingUnitOfWork } from "../../domain/ports/billing-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentByWebhookEventId,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwBillingError } from "../errors";

export interface ProcessBillingWebhookDeps {
	unitOfWork: BillingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function processBillingWebhook(
	deps: ProcessBillingWebhookDeps,
	input: ProcessBillingWebhookCommand,
): Promise<BillingCommandResult> {
	const command = processBillingWebhookCommandSchema.parse(input);
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
	const replayByWebhook = await loadIdempotentByWebhookEventId(
		deps.commandJournal,
		command.webhookEventId,
	);
	if (replayByWebhook) return replayByWebhook;
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
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
		const racedByWebhook = await ctx.commandJournal.findByWebhookEventId(
			command.webhookEventId,
		);
		if (racedByWebhook) {
			if (racedByWebhook.organizationId !== command.organizationId) {
				throwBillingError(
					"BIL_CROSS_TENANT",
					"webhook event organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(
				racedByWebhook.responseSnapshot,
			);
			return billingCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return billingCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
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
			webhookEventId: command.webhookEventId,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
