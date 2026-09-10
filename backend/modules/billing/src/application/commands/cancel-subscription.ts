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
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwBillingError } from "../errors";

export interface CancelSubscriptionDeps {
	unitOfWork: BillingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function cancelSubscription(
	deps: CancelSubscriptionDeps,
	input: CancelSubscriptionCommand,
): Promise<BillingCommandResult> {
	const command = cancelSubscriptionCommandSchema.parse(input);
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
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
