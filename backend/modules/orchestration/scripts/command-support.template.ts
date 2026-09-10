import { createHash } from "node:crypto";
import type { CheckoutTaskResult } from "@anxionos/contracts/orchestration";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCheckoutResultSnapshot } from "./errors";

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

export interface OrchestrationCommandSnapshot {
	aggregateId: string;
	revision: number;
	idempotentReplay?: boolean;
	requestHash: string;
}

export interface RecordGateDispositionSnapshot {
	bindingId: string;
	aggregateId: string;
	revision: number;
	invalidatedPriorCount: number;
	idempotentReplay?: boolean;
	requestHash: string;
}

function deterministicCommandUuid(seed: string): string {
	const hash = createHash("sha256").update(seed).digest();
	const bytes = Buffer.from(hash.subarray(0, 16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytes.toString("hex");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildCheckoutCommandId(
	agentId: string,
	taskId: string,
): string {
	return deterministicCommandUuid(`checkout:${agentId}:${taskId}`);
}

export function buildRecordGateDispositionCommandId(
	issueIdentifier: string,
	gateId: string,
	digest: string | null | undefined,
	disposition: string,
): string {
	const digestKey = digest ?? "NOT_APPLICABLE";
	return deterministicCommandUuid(
		`gate-disposition:${issueIdentifier}:${gateId}:${digestKey}:${disposition}`,
	);
}

export function toRecordGateDispositionSnapshot(
	result: RecordGateDispositionSnapshot,
): Record<string, unknown> {
	return {
		bindingId: result.bindingId,
		aggregateId: result.aggregateId,
		revision: result.revision,
		invalidatedPriorCount: result.invalidatedPriorCount,
		idempotentReplay: result.idempotentReplay ?? false,
		[COMMAND_JOURNAL_REQUEST_HASH_KEY]: result.requestHash,
	};
}

export async function loadIdempotentRecordGateDispositionSnapshot(
	commandJournal: CommandJournalRepository,
	commandId: string,
	requestHash: string,
): Promise<RecordGateDispositionSnapshot | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing?.responseSnapshot) return null;
	assertCommandJournalReplay(existing.responseSnapshot, requestHash);
	const snapshot = existing.responseSnapshot;
	if (
		typeof snapshot.bindingId !== "string" ||
		typeof snapshot.aggregateId !== "string" ||
		typeof snapshot.revision !== "number" ||
		typeof snapshot.invalidatedPriorCount !== "number"
	)
		return null;
	return {
		bindingId: snapshot.bindingId,
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		invalidatedPriorCount: snapshot.invalidatedPriorCount,
		idempotentReplay: snapshot.idempotentReplay === true,
		requestHash,
	};
}

export function buildRenewCommandId(
	agentId: string,
	taskId: string,
	leaseToken: string,
): string {
	return deterministicCommandUuid(`renew:${agentId}:${taskId}:${leaseToken}`);
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
	if (typeof stored === "string" && stored !== requestHash)
		throw new CommandJournalHashMismatchError();
}

export function toCommandResultSnapshot(
	result: OrchestrationCommandSnapshot,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		[COMMAND_JOURNAL_REQUEST_HASH_KEY]: result.requestHash,
	};
}

export async function loadIdempotentCommandSnapshot(
	commandJournal: CommandJournalRepository,
	commandId: string,
	requestHash: string,
): Promise<OrchestrationCommandSnapshot | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing?.responseSnapshot) return null;
	assertCommandJournalReplay(existing.responseSnapshot, requestHash);
	const snapshot = existing.responseSnapshot;
	if (
		typeof snapshot.aggregateId !== "string" ||
		typeof snapshot.revision !== "number"
	)
		return null;
	return {
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay === true,
		requestHash,
	};
}

export async function loadIdempotentCheckoutResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<CheckoutTaskResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	return parseCheckoutResultSnapshot(existing.responseSnapshot);
}

export function toCheckoutResultSnapshot(
	result: CheckoutTaskResult,
): Record<string, unknown> {
	return {
		task: result.task,
		run: result.run,
		leaseToken: result.leaseToken,
		idempotentReplay: result.idempotentReplay ?? false,
	};
}
