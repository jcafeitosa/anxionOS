import {
	type PortfoliosCommandResult,
	type PortfoliosErrorCode,
	portfoliosCommandResultSchema,
} from "@anxionos/contracts/portfolios";

export class PortfoliosCommandError extends Error {
	readonly code: PortfoliosErrorCode;
	constructor(code: PortfoliosErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "PortfoliosCommandError";
	}
}

export function throwPortfoliosError(
	code: PortfoliosErrorCode,
	message: string,
): never {
	throw new PortfoliosCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): PortfoliosCommandResult {
	return portfoliosCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		portfolioId: snapshot.portfolioId,
		positionId: snapshot.positionId,
		holdingId: snapshot.holdingId,
		valuationSnapshotId: snapshot.valuationSnapshotId,
		reconciliationCaseId: snapshot.reconciliationCaseId,
		cashPositionId: snapshot.cashPositionId,
		provisionalCash: snapshot.provisionalCash,
	});
}
