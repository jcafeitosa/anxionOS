import type { ExecutionCommandResult } from "@anxionos/contracts/execution";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<ExecutionCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByClientOrderId(
	commandJournal: CommandJournalRepository,
	organizationId: string,
	clientOrderId: string,
): Promise<ExecutionCommandResult | null> {
	const existing = await commandJournal.findByClientOrderId(
		organizationId,
		clientOrderId,
	);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(
	result: ExecutionCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		sessionId: result.sessionId,
		orderId: result.orderId,
		fillId: result.fillId,
		venueFillId: result.venueFillId,
	};
}

export function multiplyDecimalAmounts(left: string, right: string): string {
	const product = Number.parseFloat(left) * Number.parseFloat(right);
	const fixed = product.toFixed(8);
	return fixed.replace(/\.?0+$/, "") || "0";
}
