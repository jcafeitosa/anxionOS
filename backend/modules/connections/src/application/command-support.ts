import { createHash } from "node:crypto";
import type { ConnectionsCommandResult } from "@anxionos/contracts/connections";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwConnectionsError } from "./errors";

export interface ConnectionsCommandIntent {
	commandName: string;
	requestHash: string;
}

async function assertIntentMatches(
	existing: {
		organizationId: string;
		commandName: string;
		requestHash: string | null;
	},
	organizationId: string,
	intent: ConnectionsCommandIntent,
	commandId: string,
): Promise<void> {
	if (
		existing.organizationId !== organizationId ||
		existing.commandName !== intent.commandName ||
		existing.requestHash !== intent.requestHash
	) {
		throwConnectionsError(
			"CX_IDEMPOTENCY_CONFLICT",
			`Idempotency key ${commandId} was already used with a different intent`,
		);
	}
}

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	organizationId: string,
	commandId: string,
	intent: ConnectionsCommandIntent,
): Promise<ConnectionsCommandResult | null> {
	const existing = await commandJournal.findByCommandId(
		organizationId,
		commandId,
	);
	if (!existing) {
		return null;
	}
	await assertIntentMatches(existing, organizationId, intent, commandId);
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function hashCommandPayload(payload: Record<string, unknown>): string {
	return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

export function createConnectionsCommandIntent(
	commandName: string,
	payload: Record<string, unknown>,
): ConnectionsCommandIntent {
	return { commandName, requestHash: hashCommandPayload(payload) };
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
	result: ConnectionsCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		inferenceRequestId: result.inferenceRequestId,
	};
}
