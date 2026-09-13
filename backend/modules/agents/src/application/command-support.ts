import { createHash } from "node:crypto";
import type { CommandResult } from "@anxionos/contracts/agents";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwAgentsError } from "./errors";

export interface AgentCommandIntent {
	commandName: string;
	aggregateId?: string;
	matchesAggregate?: (aggregateId: string) => Promise<boolean>;
	requestHash: string;
}

async function assertIntentMatches(
	existing: {
		commandName: string;
		aggregateId: string;
		requestHash: string | null;
	},
	intent: AgentCommandIntent,
	commandId: string,
): Promise<void> {
	if (existing.commandName !== intent.commandName) {
		throwAgentsError(
			"AGT_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already used by another command`,
		);
	}
	if (
		intent.aggregateId !== undefined &&
		existing.aggregateId !== intent.aggregateId
	) {
		throwAgentsError(
			"AGT_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already applied to another resource`,
		);
	}
	if (intent.matchesAggregate) {
		const matches = await intent.matchesAggregate(existing.aggregateId);
		if (!matches) {
			throwAgentsError(
				"AGT_DUPLICATE_IDEMPOTENCY",
				`Idempotency key ${commandId} was already applied to another resource`,
			);
		}
	}
	if (existing.requestHash !== intent.requestHash) {
		throwAgentsError(
			"AGT_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already applied with a different payload`,
		);
	}
}

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	tenantId: string,
	commandId: string,
	intent: AgentCommandIntent,
): Promise<CommandResult | null> {
	const existing = await commandJournal.findByCommandId(tenantId, commandId);
	if (!existing) {
		return null;
	}
	await assertIntentMatches(existing, intent, commandId);
	return parseCommandResultSnapshot(existing.responseSnapshot);
}

export function hashCommandPayload(payload: Record<string, unknown>): string {
	return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

export function createAgentCommandIntent(
	commandName: string,
	payload: Record<string, unknown>,
	aggregateId?: string,
): AgentCommandIntent {
	return {
		commandName,
		aggregateId,
		requestHash: hashCommandPayload(payload),
	};
}

function canonicalJson(value: unknown): string {
	if (value === undefined || value === null) {
		return "null";
	}
	if (Array.isArray(value)) {
		return `[${value.map(canonicalJson).join(",")}]`;
	}
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
	result: CommandResult,
	extras?: Record<string, unknown>,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		...extras,
	};
}

export function readSnapshotString(
	snapshot: Record<string, unknown> | null | undefined,
	key: string,
): string | undefined {
	const value = snapshot?.[key];
	return typeof value === "string" ? value : undefined;
}
