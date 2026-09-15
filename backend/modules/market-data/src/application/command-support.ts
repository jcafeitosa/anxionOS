import { createHash } from "node:crypto";
import type { MarketDataCommandResult } from "@anxionos/contracts/market-data";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwMarketDataError } from "./errors";

export interface MarketDataCommandIntent {
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
	intent: MarketDataCommandIntent,
	commandId: string,
): void {
	if (
		existing.organizationId !== organizationId ||
		existing.commandName !== intent.commandName ||
		existing.requestHash !== intent.requestHash
	) {
		throwMarketDataError(
			"MD_IDEMPOTENCY_CONFLICT",
			`Idempotency key ${commandId} was already used with a different intent`,
		);
	}
}

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	organizationId: string,
	commandId: string,
	intent: MarketDataCommandIntent,
): Promise<MarketDataCommandResult | null> {
	const existing = await commandJournal.findByCommandId(
		organizationId,
		commandId,
	);
	if (!existing) return null;
	assertIntentMatches(existing, organizationId, intent, commandId);
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function createMarketDataCommandIntent(
	commandName: string,
	payload: Record<string, unknown>,
): MarketDataCommandIntent {
	return {
		commandName,
		requestHash: hashCommandPayload(payload),
	};
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

export function toCommandResultSnapshot(
	result: MarketDataCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		instrumentId: result.instrumentId,
		observationHeaderId: result.observationHeaderId,
	};
}
