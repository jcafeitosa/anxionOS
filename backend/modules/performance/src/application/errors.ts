import {
	type PerformanceCommandResult,
	type PerformanceErrorCode,
	performanceCommandResultSchema,
} from "@anxionos/contracts/performance";

export class PerformanceCommandError extends Error {
	readonly code: PerformanceErrorCode;

	constructor(code: PerformanceErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "PerformanceCommandError";
	}
}

export function throwPerformanceError(
	code: PerformanceErrorCode,
	message: string,
): never {
	throw new PerformanceCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): PerformanceCommandResult {
	return performanceCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		outcomeSnapshotId: snapshot.outcomeSnapshotId,
	});
}
