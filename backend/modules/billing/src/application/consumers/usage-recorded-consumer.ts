import { randomUUID } from "node:crypto";
import {
	type BillingCommandResult,
	billingCommandResultSchema,
	type ConnectionsUsageRecordedBridge,
	mapUsageRecordedToBillingInput,
} from "@anxionos/contracts/billing";
import type { BillingUnitOfWork } from "../../domain/ports/billing-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	addDecimalAmounts,
	loadIdempotentByUsageRecordId,
	multiplyDecimalAmount,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwBillingError } from "../errors";

export interface UsageRecordedConsumerDeps {
	unitOfWork: BillingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export function createUsageRecordedConsumer(deps: UsageRecordedConsumerDeps): {
	handle(usage: ConnectionsUsageRecordedBridge): Promise<BillingCommandResult>;
} {
	return {
		async handle(usage: ConnectionsUsageRecordedBridge) {
			const command = mapUsageRecordedToBillingInput(usage, randomUUID());
			const existingByUsage = await deps.commandJournal.findByUsageRecordId(
				command.usageRecordId,
			);
			if (
				existingByUsage &&
				existingByUsage.organizationId !== command.organizationId
			) {
				throwBillingError(
					"BIL_CROSS_TENANT",
					"usage record organization mismatch",
				);
			}
			const replayByUsage = await loadIdempotentByUsageRecordId(
				deps.commandJournal,
				command.usageRecordId,
			);
			if (replayByUsage) return replayByUsage;
			return deps.unitOfWork.runInTransaction(async (ctx) => {
				const racedByUsage = await ctx.commandJournal.findByUsageRecordId(
					command.usageRecordId,
				);
				if (racedByUsage) {
					if (racedByUsage.organizationId !== command.organizationId) {
						throwBillingError(
							"BIL_CROSS_TENANT",
							"usage record organization mismatch",
						);
					}
					const parsed = parseCommandResultSnapshot(
						racedByUsage.responseSnapshot,
					);
					return billingCommandResultSchema.parse({
						...parsed,
						idempotentReplay: true,
					});
				}
				const existingAggregation =
					await ctx.usageAggregations.findByUsageRecordId(
						command.usageRecordId,
					);
				if (existingAggregation) {
					if (existingAggregation.organizationId !== command.organizationId) {
						throwBillingError(
							"BIL_CROSS_TENANT",
							"usage aggregation organization mismatch",
						);
					}
					const line = await ctx.invoiceLines.findByUsageRecordId(
						command.usageRecordId,
					);
					const result = billingCommandResultSchema.parse({
						aggregateId: existingAggregation.id,
						revision: 1,
						subscriptionId: existingAggregation.subscriptionId,
						invoiceId: line?.invoiceId,
						lineId: line?.id,
						usageAggregationId: existingAggregation.id,
						idempotentReplay: true,
					});
					await ctx.commandJournal.save({
						commandId: command.commandId,
						organizationId: command.organizationId,
						commandName: "recordUsage",
						usageRecordId: command.usageRecordId,
						responseSnapshot: toCommandResultSnapshot(result),
					});
					return result;
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
				let invoice = await ctx.invoices.findDraftBySubscriptionAndPeriod(
					subscription.id,
					command.billingPeriod,
				);
				if (!invoice) {
					const invoiceId = `bil_inv_${randomUUID()}`;
					invoice = await ctx.invoices.save({
						id: invoiceId,
						organizationId: command.organizationId,
						subscriptionId: subscription.id,
						billingPeriod: command.billingPeriod,
						status: "DRAFT",
						totalAmount: "0",
						issuedAt: null,
					});
				}
				const amount = multiplyDecimalAmount(
					command.quantity,
					command.unitPrice,
				);
				const lineId = `bil_line_${randomUUID()}`;
				const savedLine = await ctx.invoiceLines.save({
					id: lineId,
					invoiceId: invoice.id,
					organizationId: command.organizationId,
					usageRecordId: command.usageRecordId,
					description: `${command.unit}:${command.consumerKind}`,
					quantity: String(command.quantity),
					unitPrice: command.unitPrice,
					amount,
				});
				const aggregationId = `bil_uag_${randomUUID()}`;
				const savedAggregation = await ctx.usageAggregations.save({
					id: aggregationId,
					organizationId: command.organizationId,
					subscriptionId: subscription.id,
					usageRecordId: command.usageRecordId,
					billingPeriod: command.billingPeriod,
					quantity: String(command.quantity),
					unit: command.unit,
					unitPrice: command.unitPrice,
					amount,
					consumerKind: command.consumerKind,
				});
				const newTotal = addDecimalAmounts(invoice.totalAmount, amount);
				await ctx.invoices.updateTotalAmount(invoice.id, newTotal);
				const result = billingCommandResultSchema.parse({
					aggregateId: savedAggregation.id,
					revision: 1,
					subscriptionId: subscription.id,
					invoiceId: invoice.id,
					lineId: savedLine.id,
					usageAggregationId: savedAggregation.id,
				});
				await ctx.commandJournal.save({
					commandId: command.commandId,
					organizationId: command.organizationId,
					commandName: "recordUsage",
					usageRecordId: command.usageRecordId,
					responseSnapshot: toCommandResultSnapshot(result),
				});
				return result;
			});
		},
	};
}
