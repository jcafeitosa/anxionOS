import {
	type ExecutionCommandResult,
	type ExecutionModuleErrorCode,
	executionCommandResultSchema,
} from "@anxionos/contracts/execution";

export class ExecutionCommandError extends Error {
	readonly code: ExecutionModuleErrorCode;

	constructor(code: ExecutionModuleErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "ExecutionCommandError";
	}
}

export function throwExecutionError(
	code: ExecutionModuleErrorCode,
	message: string,
): never {
	throw new ExecutionCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): ExecutionCommandResult {
	return executionCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		sessionId: snapshot.sessionId,
		orderId: snapshot.orderId,
		fillId: snapshot.fillId,
		venueFillId: snapshot.venueFillId,
	});
}
