import type { DecisionsCommandResult } from "@anxionos/contracts/decisions";
import { decisionsCommandResultSchema } from "@anxionos/contracts/decisions";
import type {
	CommandJournalEntry,
	CommandJournalRepository,
} from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwDecisionsError } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<DecisionsCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentCommandResultWithGuard(
	commandJournal: CommandJournalRepository,
	commandId: string,
	organizationId: string,
): Promise<DecisionsCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	if (existing.organizationId !== organizationId) {
		throwDecisionsError(
			"DC_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function replayIdempotentCommandJournalEntry(
	existing: CommandJournalEntry,
	organizationId: string,
): DecisionsCommandResult {
	if (existing.organizationId !== organizationId) {
		throwDecisionsError(
			"DC_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return decisionsCommandResultSchema.parse({
		...parsed,
		idempotentReplay: true,
	});
}

export function toCommandResultSnapshot(
	result: DecisionsCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		decisionId: result.decisionId,
		proposalId: result.proposalId,
		intentId: result.intentId,
		approvalId: result.approvalId,
		dispositionId: result.dispositionId,
		waitingHuman: result.waitingHuman ?? false,
	};
}
