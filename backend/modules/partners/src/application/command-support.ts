import { createHash } from "node:crypto";
import type { PartnersCommandResult } from "@anxionos/contracts/partners";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwPartnersError } from "./errors";

export interface PartnersCommandIntent {
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
	intent: PartnersCommandIntent,
	commandId: string,
): void {
	if (
		existing.organizationId !== organizationId ||
		existing.commandName !== intent.commandName ||
		existing.requestHash !== intent.requestHash
	) {
		throwPartnersError(
			"PTR_IDEMPOTENCY_CONFLICT",
			`Idempotency key ${commandId} was already used with a different intent`,
		);
	}
}

export function createPartnersCommandIntent(
	commandName: string,
	payload: object,
): PartnersCommandIntent {
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
		return `{${entries
			.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	organizationId: string,
	commandId: string,
	intent: PartnersCommandIntent,
): Promise<PartnersCommandResult | null> {
	const existing = await commandJournal.findByCommandId(
		organizationId,
		commandId,
	);
	if (!existing) return null;
	assertIntentMatches(existing, organizationId, intent, commandId);
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByInvoiceId(
	commandJournal: CommandJournalRepository,
	organizationId: string,
	invoiceId: string,
	intent: PartnersCommandIntent,
): Promise<PartnersCommandResult | null> {
	const existing = await commandJournal.findByInvoiceId(
		organizationId,
		invoiceId,
	);
	if (!existing) return null;
	assertIntentMatches(existing, organizationId, intent, existing.commandId);
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(
	result: PartnersCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		partnerId: result.partnerId,
		referralId: result.referralId,
		commissionAccrualId: result.commissionAccrualId,
		commissionAmount: result.commissionAmount,
		payoutId: result.payoutId,
	};
}
