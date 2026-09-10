import type { CommandResult } from "@anxionos/contracts/agents";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	tenantId: string,
	commandId: string,
): Promise<CommandResult | null> {
	const existing = await commandJournal.findByCommandId(tenantId, commandId);
	if (!existing) {
		return null;
	}
	return parseCommandResultSnapshot(existing.responseSnapshot);
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
