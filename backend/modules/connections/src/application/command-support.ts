import type { ConnectionsCommandResult } from "@anxionos/contracts/connections";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<ConnectionsCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) {
		return null;
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
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
