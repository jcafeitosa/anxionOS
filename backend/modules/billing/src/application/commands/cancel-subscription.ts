import type {
	BillingCommandResult,
	CancelSubscriptionCommand,
} from "@anxionos/contracts/billing";
import {
	billingCommandResultSchema,
	cancelSubscriptionCommandSchema,
} from "@anxionos/contracts/billing";
import { createSubscriptionCancelledEvent } from "../../domain/events/billing-events";
import type { BillingUnitOfWork } from "../../domain/ports/billing-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	createBillingCommandIntent,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { throwBillingError } from "../errors";

export interface CancelSubscriptionDeps {
	unitOfWork: BillingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function cancelSubscription(
	deps: CancelSubscriptionDeps,
	input: CancelSubscriptionCommand,
): Promise<BillingCommandResult> {
	const command = cancelSubscriptionCommandSchema.parse(input);
	const intent = createBillingCommandIntent("cancelSubscription", command);
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
		if (subscription.status === "CANCELLED") {
			const result = billingCommandResultSchema.parse({
				aggregateId: subscription.id,
				revision: 1,
				subscriptionId: subscription.id,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "cancelSubscription",
				requestHash: intent.requestHash,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const cancelled = await ctx.subscriptions.updateStatus(
			subscription.id,
			"CANCELLED",
		);
		await ctx.publishEvents([
			createSubscriptionCancelledEvent({
				subscriptionId: cancelled.id,
				organizationId: cancelled.organizationId,
				cancelledAt: command.cancelledAt,
				reason: command.reason,
			}),
		]);
		const result = billingCommandResultSchema.parse({
			aggregateId: cancelled.id,
			revision: 1,
			subscriptionId: cancelled.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "cancelSubscription",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
