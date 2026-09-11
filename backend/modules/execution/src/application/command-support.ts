import type {
	CancelOrderCommand,
	ExecutionCommandResult,
	RecordFillCommand,
	SubmitOrderCommand,
} from "@anxionos/contracts/execution";
import { executionCommandResultSchema } from "@anxionos/contracts/execution";
import type {
	CommandJournalEntry,
	CommandJournalRepository,
} from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwExecutionError } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<ExecutionCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentCommandResultWithGuard(
	commandJournal: CommandJournalRepository,
	commandId: string,
	organizationId: string,
): Promise<ExecutionCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	if (existing.organizationId !== organizationId) {
		throwExecutionError(
			"EX_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function replayIdempotentCommandJournalEntry(
	existing: CommandJournalEntry,
	organizationId: string,
): ExecutionCommandResult {
	if (existing.organizationId !== organizationId) {
		throwExecutionError(
			"EX_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return executionCommandResultSchema.parse({
		...parsed,
		idempotentReplay: true,
	});
}

export function buildSubmitOrderFingerprint(
	command: SubmitOrderCommand,
): string {
	return JSON.stringify({
		sessionId: command.sessionId,
		clientOrderId: command.clientOrderId,
		instrumentId: command.instrumentId,
		side: command.side,
		quantity: command.quantity,
		price: command.price,
		fillQuantity: command.fillQuantity ?? command.quantity,
		deferFill: command.deferFill ?? false,
	});
}

export function assertMatchingSubmitOrderFingerprint(
	storedFingerprint: string | undefined,
	command: SubmitOrderCommand,
): void {
	const current = buildSubmitOrderFingerprint(command);
	if (storedFingerprint && storedFingerprint !== current) {
		throwExecutionError(
			"EX_DUPLICATE_CLIENT_ORDER",
			"client order id conflicts with prior payload",
		);
	}
}

export async function loadIdempotentByClientOrderId(
	commandJournal: CommandJournalRepository,
	organizationId: string,
	clientOrderId: string,
	expectedFingerprint?: string,
): Promise<ExecutionCommandResult | null> {
	const existing = await commandJournal.findByClientOrderId(
		organizationId,
		clientOrderId,
	);
	if (!existing) return null;
	if (expectedFingerprint) {
		const stored = existing.responseSnapshot.requestFingerprint;
		if (typeof stored === "string" && stored !== expectedFingerprint) {
			throwExecutionError(
				"EX_DUPLICATE_CLIENT_ORDER",
				"client order id conflicts with prior payload",
			);
		}
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(
	result: ExecutionCommandResult,
	extra?: Record<string, unknown>,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		sessionId: result.sessionId,
		orderId: result.orderId,
		fillId: result.fillId,
		venueFillId: result.venueFillId,
		orderStatus: result.orderStatus,
		remainingQuantity: result.remainingQuantity,
		reconciliationCaseId: result.reconciliationCaseId,
		venueDispatchStatus: result.venueDispatchStatus,
		disposition: result.disposition,
		...extra,
	};
}

export function multiplyDecimalAmounts(left: string, right: string): string {
	const product = Number.parseFloat(left) * Number.parseFloat(right);
	const fixed = product.toFixed(8);
	return fixed.replace(/\.?0+$/, "") || "0";
}

export function addDecimalAmounts(left: string, right: string): string {
	const sum = Number.parseFloat(left) + Number.parseFloat(right);
	const fixed = sum.toFixed(8);
	return fixed.replace(/\.?0+$/, "") || "0";
}

export function subtractDecimalAmounts(left: string, right: string): string {
	const diff = Number.parseFloat(left) - Number.parseFloat(right);
	const fixed = diff.toFixed(8);
	return fixed.replace(/\.?0+$/, "") || "0";
}

export function compareDecimalAmounts(left: string, right: string): number {
	return Number.parseFloat(left) - Number.parseFloat(right);
}

export function resolveOrderStatusAfterFill(
	orderQuantity: string,
	filledQuantity: string,
): "SUBMITTED" | "PARTIALLY_FILLED" | "FILLED" {
	const remaining = compareDecimalAmounts(orderQuantity, filledQuantity);
	if (remaining <= 0) return "FILLED";
	if (compareDecimalAmounts(filledQuantity, "0") > 0) return "PARTIALLY_FILLED";
	return "SUBMITTED";
}

export function assertOrderMatchesSubmitCommand(
	order: {
		sessionId: string;
		instrumentId: string;
		side: string;
		quantity: string;
		price: string;
	},
	command: SubmitOrderCommand,
): void {
	if (
		order.sessionId !== command.sessionId ||
		order.instrumentId !== command.instrumentId ||
		order.side !== command.side ||
		order.quantity !== command.quantity ||
		order.price !== command.price
	) {
		throwExecutionError(
			"EX_DUPLICATE_CLIENT_ORDER",
			"client order already exists with conflicting payload",
		);
	}
}

export function assertOrderMatchesCancelCommand(
	order: { id: string; organizationId: string },
	command: CancelOrderCommand,
): void {
	if (
		order.id !== command.orderId ||
		order.organizationId !== command.organizationId
	) {
		throwExecutionError("EX_ORDER_NOT_FOUND", "execution order not found");
	}
}

export function assertOrderMatchesRecordFillCommand(
	order: { id: string; organizationId: string },
	command: RecordFillCommand,
): void {
	if (
		order.id !== command.orderId ||
		order.organizationId !== command.organizationId
	) {
		throwExecutionError("EX_ORDER_NOT_FOUND", "execution order not found");
	}
}
