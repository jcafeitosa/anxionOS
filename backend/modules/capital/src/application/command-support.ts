import { createHash } from "node:crypto";
import type { CapitalCommandResult } from "@anxionos/contracts/capital";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwCapitalError } from "./errors";

export const COMMAND_JOURNAL_REQUEST_HASH_KEY = "requestHash";

export class CommandJournalHashMismatchError extends Error {
	constructor(
		message = "Command journal request hash mismatch",
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = "CommandJournalHashMismatchError";
	}
}

function stableStringify(value: unknown): string {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value))
		return `[${value.map((item) => stableStringify(item)).join(",")}]`;
	const record = value as Record<string, unknown>;
	const keys = Object.keys(record).sort();
	return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

export function hashCommandPayload(payload: unknown): string {
	return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

export function assertCommandJournalReplay(
	existingSnapshot: Record<string, unknown> | null,
	requestHash: string,
): void {
	const stored = existingSnapshot?.[COMMAND_JOURNAL_REQUEST_HASH_KEY];
	if (typeof stored === "string" && stored !== requestHash) {
		throw new CommandJournalHashMismatchError();
	}
}

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
) {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentCommandResultWithGuard(
	commandJournal: CommandJournalRepository,
	commandId: string,
	organizationId: string,
	requestHash: string,
): Promise<CapitalCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	if (existing.organizationId !== organizationId) {
		throwCapitalError(
			"CAP_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	assertCommandJournalReplay(existing.responseSnapshot, requestHash);
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(
	result: CapitalCommandResult,
	requestHash?: string,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		accountId: result.accountId,
		allocationId: result.allocationId,
		reservationId: result.reservationId,
		...(requestHash
			? { [COMMAND_JOURNAL_REQUEST_HASH_KEY]: requestHash }
			: {}),
	};
}
