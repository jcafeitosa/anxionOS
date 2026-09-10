import type { BillingCommandResult } from "@anxionos/contracts/billing";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<BillingCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByUsageRecordId(
	commandJournal: CommandJournalRepository,
	usageRecordId: string,
): Promise<BillingCommandResult | null> {
	const existing = await commandJournal.findByUsageRecordId(usageRecordId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByWebhookEventId(
	commandJournal: CommandJournalRepository,
	webhookEventId: string,
): Promise<BillingCommandResult | null> {
	const existing = await commandJournal.findByWebhookEventId(webhookEventId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(
	result: BillingCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		subscriptionId: result.subscriptionId,
		invoiceId: result.invoiceId,
		lineId: result.lineId,
		usageAggregationId: result.usageAggregationId,
	};
}

export function multiplyDecimalAmount(
	quantity: number,
	unitPrice: string,
): string {
	const amount = quantity * Number.parseFloat(unitPrice);
	return amount.toFixed(8).replace(/\.?0+$/, "") || "0";
}

export function addDecimalAmounts(left: string, right: string): string {
	const sum = Number.parseFloat(left) + Number.parseFloat(right);
	return sum.toFixed(8).replace(/\.?0+$/, "") || "0";
}
