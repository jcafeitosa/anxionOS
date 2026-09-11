import type { IdentityCommandResult } from "@anxionos/contracts/identity";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

/**
 * R04 idempotency: if the `commandId` was already processed, the original
 * result is replayed and the command body must not run again.
 */
export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string | undefined,
): Promise<IdentityCommandResult | null> {
	if (!commandId) {
		return null;
	}
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) {
		return null;
	}
	return parseCommandResultSnapshot(existing.responseSnapshot);
}

export function toCommandResultSnapshot(
	result: IdentityCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		status: result.status,
	};
}
