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
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwBillingError } from "../errors";

export interface CreateSubscriptionDeps {
	unitOfWork: BillingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function createSubscription(
	deps: CreateSubscriptionDeps,
	input: CreateSubscriptionCommand,
): Promise<BillingCommandResult> {
	const command = createSubscriptionCommandSchema.parse(input);
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
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
