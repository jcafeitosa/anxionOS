import type {
	ConnectionsCommandResult,
	ConnectionsErrorCode,
} from "@anxionos/contracts/connections";

export class ConnectionsCommandError extends Error {
	readonly code: ConnectionsErrorCode;

	constructor(code: ConnectionsErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "ConnectionsCommandError";
	}
}

export function throwConnectionsError(
	code: ConnectionsErrorCode,
	message: string,
): never {
	throw new ConnectionsCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): ConnectionsCommandResult {
	return {
		aggregateId: String(snapshot.aggregateId),
		revision: Number(snapshot.revision),
		idempotentReplay: snapshot.idempotentReplay === true,
		inferenceRequestId: snapshot.inferenceRequestId
			? String(snapshot.inferenceRequestId)
			: undefined,
	};
}
