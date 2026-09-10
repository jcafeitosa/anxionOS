import type { EvaluationCommandResult } from "@anxionos/contracts/evaluation";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<EvaluationCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByOutcomeSnapshotId(
	commandJournal: CommandJournalRepository,
	outcomeSnapshotId: string,
): Promise<EvaluationCommandResult | null> {
	const existing =
		await commandJournal.findByOutcomeSnapshotId(outcomeSnapshotId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(
	result: EvaluationCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		evaluationRecordId: result.evaluationRecordId,
		evaluationScoreId: result.evaluationScoreId,
	};
}
