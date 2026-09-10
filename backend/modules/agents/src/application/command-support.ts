import type { CommandResult } from "@anxionos/contracts/agents";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<CommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) {
		return null;
	}
	return parseCommandResultSnapshot(existing.responseSnapshot);
}

export function toCommandResultSnapshot(result: CommandResult): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
	};
}
