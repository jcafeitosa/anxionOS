import {
	type ExecutionCommandResult,
	type ExecutionModuleErrorCode,
	executionCommandResultSchema,
} from "@anxionos/contracts/execution";

export class DuplicateVenueFillSignal extends Error {
	readonly organizationId: string;
	readonly orderId: string;
	readonly existingFillId: string;
	readonly venueFillId: string;
	readonly venueAdapterRefId: string;

	constructor(input: {
		organizationId: string;
		orderId: string;
		existingFillId: string;
		venueFillId: string;
		venueAdapterRefId: string;
	}) {
		super("duplicate venue fill detected");
		this.name = "DuplicateVenueFillSignal";
		this.organizationId = input.organizationId;
		this.orderId = input.orderId;
		this.existingFillId = input.existingFillId;
		this.venueFillId = input.venueFillId;
		this.venueAdapterRefId = input.venueAdapterRefId;
	}
}

export class ExecutionCommandError extends Error {
	readonly code: ExecutionModuleErrorCode;
	readonly reconciliationCaseId?: string;
	readonly disposition?: string;

	constructor(
		code: ExecutionModuleErrorCode,
		message: string,
		details?: { reconciliationCaseId?: string; disposition?: string },
	) {
		super(message);
		this.code = code;
		this.name = "ExecutionCommandError";
		this.reconciliationCaseId = details?.reconciliationCaseId;
		this.disposition = details?.disposition;
	}
}

export function throwExecutionError(
	code: ExecutionModuleErrorCode,
	message: string,
	details?: { reconciliationCaseId?: string; disposition?: string },
): never {
	throw new ExecutionCommandError(code, message, details);
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
		orderStatus: snapshot.orderStatus,
		remainingQuantity: snapshot.remainingQuantity,
		reconciliationCaseId: snapshot.reconciliationCaseId,
		venueDispatchStatus: snapshot.venueDispatchStatus,
		disposition: snapshot.disposition,
	});
}
