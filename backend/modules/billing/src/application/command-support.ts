import { createHash } from "node:crypto";
import type { BillingCommandResult } from "@anxionos/contracts/billing";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwBillingError } from "./errors";

export interface BillingCommandIntent {
	commandName: string;
	requestHash: string;
}

function assertIntentMatches(
	existing: {
		organizationId: string;
		commandName: string;
		requestHash: string | null;
	},
	organizationId: string,
	intent: BillingCommandIntent,
	commandId: string,
): void {
	if (
		existing.organizationId !== organizationId ||
		existing.commandName !== intent.commandName ||
		existing.requestHash !== intent.requestHash
	) {
		throwBillingError(
			"BIL_IDEMPOTENCY_CONFLICT",
			`Idempotency key ${commandId} was already used with a different intent`,
		);
	}
}

export function createBillingCommandIntent(
	commandName: string,
	payload: object,
): BillingCommandIntent {
	const semanticPayload = { ...(payload as Record<string, unknown>) };
	delete semanticPayload.commandId;
	return { commandName, requestHash: hashCommandPayload(semanticPayload) };
}

export function hashCommandPayload(payload: Record<string, unknown>): string {
	return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function canonicalJson(value: unknown): string {
	if (value === undefined || value === null) return "null";
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, entry]) => entry !== undefined)
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
		return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
	}
	return JSON.stringify(value);
}

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	organizationId: string,
	commandId: string,
	intent: BillingCommandIntent,
): Promise<BillingCommandResult | null> {
	const existing = await commandJournal.findByCommandId(
		organizationId,
		commandId,
	);
	if (!existing) return null;
	assertIntentMatches(existing, organizationId, intent, commandId);
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByUsageRecordId(
	commandJournal: CommandJournalRepository,
	organizationId: string,
	usageRecordId: string,
	intent: BillingCommandIntent,
): Promise<BillingCommandResult | null> {
	const existing = await commandJournal.findByUsageRecordId(
		organizationId,
		usageRecordId,
	);
	if (!existing) return null;
	assertIntentMatches(existing, organizationId, intent, existing.commandId);
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByWebhookEventId(
	commandJournal: CommandJournalRepository,
	organizationId: string,
	webhookEventId: string,
	intent: BillingCommandIntent,
): Promise<BillingCommandResult | null> {
	const existing = await commandJournal.findByWebhookEventId(
		organizationId,
		webhookEventId,
	);
	if (!existing) return null;
	assertIntentMatches(existing, organizationId, intent, existing.commandId);
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
