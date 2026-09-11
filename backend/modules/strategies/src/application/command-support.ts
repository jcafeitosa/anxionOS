import type { StrategiesCommandResult } from "@anxionos/contracts/strategies";
import { strategiesCommandResultSchema } from "@anxionos/contracts/strategies";
import type {
	CommandJournalEntry,
	CommandJournalRepository,
} from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwStrategiesError } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<StrategiesCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentCommandResultWithGuard(
	commandJournal: CommandJournalRepository,
	commandId: string,
	organizationId: string,
): Promise<StrategiesCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	if (existing.organizationId !== organizationId) {
		throwStrategiesError(
			"ST_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function replayIdempotentCommandJournalEntry(
	existing: CommandJournalEntry,
	organizationId: string,
): StrategiesCommandResult {
	if (existing.organizationId !== organizationId) {
		throwStrategiesError(
			"ST_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return strategiesCommandResultSchema.parse({
		...parsed,
		idempotentReplay: true,
	});
}

export function toCommandResultSnapshot(
	result: StrategiesCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		strategyId: result.strategyId,
		strategyVersionId: result.strategyVersionId,
		backtestRunId: result.backtestRunId,
		deploymentId: result.deploymentId,
		signalId: result.signalId,
	};
}
