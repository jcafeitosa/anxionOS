import {
	type StrategiesCommandResult,
	type StrategiesErrorCode,
	strategiesCommandResultSchema,
} from "@anxionos/contracts/strategies";

export class StrategiesCommandError extends Error {
	readonly code: StrategiesErrorCode;

	constructor(code: StrategiesErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "StrategiesCommandError";
	}
}

export function throwStrategiesError(
	code: StrategiesErrorCode,
	message: string,
): never {
	throw new StrategiesCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): StrategiesCommandResult {
	return strategiesCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		strategyId: snapshot.strategyId,
		strategyVersionId: snapshot.strategyVersionId,
	});
}
