import { randomUUID } from "node:crypto";
import type {
	BillingCommandResult,
	CreateSubscriptionCommand,
} from "@anxionos/contracts/billing";
import {
	billingCommandResultSchema,
	createSubscriptionCommandSchema,
} from "@anxionos/contracts/billing";
import type { BillingUnitOfWork } from "../../domain/ports/billing-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	createBillingCommandIntent,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { throwBillingError } from "../errors";

export interface CreateSubscriptionDeps {
	unitOfWork: BillingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function createSubscription(
	deps: CreateSubscriptionDeps,
	input: CreateSubscriptionCommand,
): Promise<BillingCommandResult> {
	const command = createSubscriptionCommandSchema.parse(input);
	const intent = createBillingCommandIntent("createSubscription", command);
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
		const existing = await ctx.subscriptions.findActiveByOrganizationAndPlan(
			command.organizationId,
			command.planCode,
		);
		if (existing) {
			const result = billingCommandResultSchema.parse({
				aggregateId: existing.id,
				revision: 1,
				subscriptionId: existing.id,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "createSubscription",
				requestHash: intent.requestHash,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const subscriptionId = `bil_sub_${randomUUID()}`;
		const saved = await ctx.subscriptions.save({
			id: subscriptionId,
			organizationId: command.organizationId,
			planCode: command.planCode,
			billingPeriodStart: command.billingPeriodStart,
			billingPeriodEnd: command.billingPeriodEnd,
			status: "ACTIVE",
		});
		const result = billingCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			subscriptionId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "createSubscription",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
