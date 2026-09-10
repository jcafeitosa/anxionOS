import type {
	CapitalCommandResult,
	CapitalErrorCode,
} from "@anxionos/contracts/capital";
import { capitalCommandResultSchema } from "@anxionos/contracts/capital";

export class CapitalCommandError extends Error {
	code: CapitalErrorCode;
	constructor(code: CapitalErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "CapitalCommandError";
	}
}
export function throwCapitalError(
	code: CapitalErrorCode,
	message: string,
): never {
	throw new CapitalCommandError(code, message);
}
export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): CapitalCommandResult {
	return capitalCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		accountId: snapshot.accountId,
		allocationId: snapshot.allocationId,
		reservationId: snapshot.reservationId,
	});
}
