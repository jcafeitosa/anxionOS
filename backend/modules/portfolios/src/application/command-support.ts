import type { PortfoliosCommandResult } from "@anxionos/contracts/portfolios";
import { portfoliosCommandResultSchema } from "@anxionos/contracts/portfolios";
import type {
	CommandJournalEntry,
	CommandJournalRepository,
} from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwPortfoliosError } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<PortfoliosCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentCommandResultWithGuard(
	commandJournal: CommandJournalRepository,
	commandId: string,
	organizationId: string,
): Promise<PortfoliosCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	if (existing.organizationId !== organizationId) {
		throwPortfoliosError(
			"PF_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function replayIdempotentCommandJournalEntry(
	existing: CommandJournalEntry,
	organizationId: string,
): PortfoliosCommandResult {
	if (existing.organizationId !== organizationId) {
		throwPortfoliosError(
			"PF_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return portfoliosCommandResultSchema.parse({
		...parsed,
		idempotentReplay: true,
	});
}

export function toCommandResultSnapshot(
	result: PortfoliosCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		portfolioId: result.portfolioId,
		positionId: result.positionId,
		holdingId: result.holdingId,
		valuationSnapshotId: result.valuationSnapshotId,
		reconciliationCaseId: result.reconciliationCaseId,
		cashPositionId: result.cashPositionId,
		provisionalCash: result.provisionalCash,
	};
}
