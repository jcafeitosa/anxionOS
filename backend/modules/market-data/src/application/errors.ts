import {
	type MarketDataCommandResult,
	type MarketDataErrorCode,
	marketDataCommandResultSchema,
} from "@anxionos/contracts/market-data";

export class MarketDataCommandError extends Error {
	readonly code: MarketDataErrorCode;

	constructor(code: MarketDataErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "MarketDataCommandError";
	}
}

export function throwMarketDataError(
	code: MarketDataErrorCode,
	message: string,
): never {
	throw new MarketDataCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): MarketDataCommandResult {
	return marketDataCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		instrumentId: snapshot.instrumentId,
		observationHeaderId: snapshot.observationHeaderId,
	});
}
