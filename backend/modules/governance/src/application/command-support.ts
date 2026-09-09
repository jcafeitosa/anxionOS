import type { GovernanceCommandResult } from "@anxionos/contracts/governance";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<GovernanceCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) {
		return null;
	}
	return parseCommandResultSnapshot(existing.responseSnapshot);
}

export function toCommandResultSnapshot(
	result: GovernanceCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		authorityEpoch: result.authorityEpoch,
	};
}
