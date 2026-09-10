import {
	type OperationsCommandResult,
	type OperationsErrorCode,
	operationsCommandResultSchema,
} from "@anxionos/contracts/operations";

export class OperationsCommandError extends Error {
	readonly code: OperationsErrorCode;

	constructor(code: OperationsErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "OperationsCommandError";
	}
}

export function throwOperationsError(
	code: OperationsErrorCode,
	message: string,
): never {
	throw new OperationsCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): OperationsCommandResult {
	return operationsCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		healthCheckId: snapshot.healthCheckId,
		incidentId: snapshot.incidentId,
	});
}
