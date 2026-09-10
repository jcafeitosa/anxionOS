import { createHash } from "node:crypto";
import type {
	CheckoutTaskResult,
	RequestWaitingHumanInputResult,
	RestartRunFromCheckpointResult,
	ResumeFromWaitingHumanInputResult,
} from "@anxionos/contracts/orchestration";
import {
	requestWaitingHumanInputResultSchema,
	restartRunFromCheckpointResultSchema,
	resumeFromWaitingHumanInputResultSchema,
} from "@anxionos/contracts/orchestration";
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


export function buildCancelTaskRunCommandId(
	idempotencyKey: string,
	runId: string,
): string {
	return deterministicCommandUuid(`cancel-run:${runId}:${idempotencyKey}`);
}

export function toCancelTaskRunSnapshot(
	result: {
		runId: string;
		taskId: string;
		status: string;
		runRevision: number;
		cancelledHeartbeats: number;
		idempotentReplay?: boolean;
	},
	requestHash: string,
): Record<string, unknown> {
	return {
		runId: result.runId,
		taskId: result.taskId,
		status: result.status,
		runRevision: result.runRevision,
		cancelledHeartbeats: result.cancelledHeartbeats,
		idempotentReplay: result.idempotentReplay ?? false,
		[COMMAND_JOURNAL_REQUEST_HASH_KEY]: requestHash,
	};
}

export async function loadIdempotentCancelTaskRunResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
	requestHash: string,
): Promise<{
	runId: string;
	taskId: string;
	status: string;
	runRevision: number;
	cancelledHeartbeats: number;
	idempotentReplay: boolean;
} | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing?.responseSnapshot) return null;
	assertCommandJournalReplay(existing.responseSnapshot, requestHash);
	const snapshot = existing.responseSnapshot;
	if (
		typeof snapshot.runId !== "string" ||
		typeof snapshot.taskId !== "string" ||
		typeof snapshot.status !== "string" ||
		typeof snapshot.runRevision !== "number" ||
		typeof snapshot.cancelledHeartbeats !== "number"
	) {
		return null;
	}
	return {
		runId: snapshot.runId,
		taskId: snapshot.taskId,
		status: snapshot.status,
		runRevision: snapshot.runRevision,
		cancelledHeartbeats: snapshot.cancelledHeartbeats,
		idempotentReplay: true,
	};
}

export function buildStopRunForBudgetCommandId(
	idempotencyKey: string,
	runId: string,
): string {
	return deterministicCommandUuid(`budget-stop:${runId}:${idempotencyKey}`);
}

export function toStopRunForBudgetSnapshot(
	result: {
		runId: string;
		taskId: string;
		status: string;
		runRevision: number;
		cancelledHeartbeats: number;
		idempotentReplay?: boolean;
	},
	requestHash: string,
): Record<string, unknown> {
	return {
		runId: result.runId,
		taskId: result.taskId,
		status: result.status,
		runRevision: result.runRevision,
		cancelledHeartbeats: result.cancelledHeartbeats,
		idempotentReplay: result.idempotentReplay ?? false,
		[COMMAND_JOURNAL_REQUEST_HASH_KEY]: requestHash,
	};
}

export async function loadIdempotentStopRunForBudgetResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
	requestHash: string,
): Promise<{
	runId: string;
	taskId: string;
	status: string;
	runRevision: number;
	cancelledHeartbeats: number;
	idempotentReplay: boolean;
} | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing?.responseSnapshot) return null;
	assertCommandJournalReplay(existing.responseSnapshot, requestHash);
	const snapshot = existing.responseSnapshot;
	if (
		typeof snapshot.runId !== "string" ||
		typeof snapshot.taskId !== "string" ||
		typeof snapshot.status !== "string" ||
		typeof snapshot.runRevision !== "number" ||
		typeof snapshot.cancelledHeartbeats !== "number"
	) {
		return null;
	}
	return {
		runId: snapshot.runId,
		taskId: snapshot.taskId,
		status: snapshot.status,
		runRevision: snapshot.runRevision,
		cancelledHeartbeats: snapshot.cancelledHeartbeats,
		idempotentReplay: true,
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


export function buildRequestWaitingHumanCommandId(
	runId: string,
	operationId: string,
): string {
	return deterministicCommandUuid(`waiting-human:request:${runId}:${operationId}`);
}

export function buildResumeWaitingHumanCommandId(
	idempotencyKey: string,
	operationId: string,
): string {
	return deterministicCommandUuid(
		`waiting-human:resume:${idempotencyKey}:${operationId}`,
	);
}

export function toWaitingHumanResultSnapshot(
	result: RequestWaitingHumanInputResult | ResumeFromWaitingHumanInputResult,
	requestHash: string,
): Record<string, unknown> {
	return {
		run: result.run,
		idempotentReplay: result.idempotentReplay ?? false,
		[COMMAND_JOURNAL_REQUEST_HASH_KEY]: requestHash,
	};
}

export async function loadIdempotentWaitingHumanResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
	requestHash: string,
): Promise<RequestWaitingHumanInputResult | ResumeFromWaitingHumanInputResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing?.responseSnapshot) return null;
	assertCommandJournalReplay(existing.responseSnapshot, requestHash);
	const snapshot = existing.responseSnapshot;
	if (!snapshot.run || typeof snapshot.run !== "object") return null;
	const parsed = {
		run: snapshot.run,
		idempotentReplay: snapshot.idempotentReplay === true,
	};
	return requestWaitingHumanInputResultSchema.safeParse(parsed).success
		? requestWaitingHumanInputResultSchema.parse(parsed)
		: resumeFromWaitingHumanInputResultSchema.parse(parsed);
}

export function buildRestartRunFromCheckpointCommandId(
	idempotencyKey: string,
	runId: string,
): string {
	return deterministicCommandUuid(`restart-run:${runId}:${idempotencyKey}`);
}

export function toRestartRunFromCheckpointSnapshot(
	result: RestartRunFromCheckpointResult,
	requestHash: string,
): Record<string, unknown> {
	return {
		run: result.run,
		leaseToken: result.leaseToken,
		idempotentReplay: result.idempotentReplay ?? false,
		[COMMAND_JOURNAL_REQUEST_HASH_KEY]: requestHash,
	};
}

export async function loadIdempotentRestartRunFromCheckpointResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
	requestHash: string,
): Promise<RestartRunFromCheckpointResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing?.responseSnapshot) return null;
	assertCommandJournalReplay(existing.responseSnapshot, requestHash);
	const snapshot = existing.responseSnapshot;
	if (!snapshot.run || typeof snapshot.run !== "object") return null;
	if (typeof snapshot.leaseToken !== "string") return null;
	return restartRunFromCheckpointResultSchema.parse({
		run: snapshot.run,
		leaseToken: snapshot.leaseToken,
		idempotentReplay: snapshot.idempotentReplay === true,
	});
}
