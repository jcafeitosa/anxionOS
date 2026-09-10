import {
	type DecisionsCommandResult,
	type DecisionsErrorCode,
	decisionsCommandResultSchema,
} from "@anxionos/contracts/decisions";

export class DecisionsCommandError extends Error {
	readonly code: DecisionsErrorCode;

	constructor(code: DecisionsErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "DecisionsCommandError";
	}
}

export function throwDecisionsError(
	code: DecisionsErrorCode,
	message: string,
): never {
	throw new DecisionsCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): DecisionsCommandResult {
	return decisionsCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		decisionId: snapshot.decisionId,
		proposalId: snapshot.proposalId,
		intentId: snapshot.intentId,
	});
}
