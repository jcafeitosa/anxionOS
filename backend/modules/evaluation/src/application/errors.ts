import {
	type EvaluationCommandResult,
	type EvaluationErrorCode,
	evaluationCommandResultSchema,
} from "@anxionos/contracts/evaluation";

export class EvaluationCommandError extends Error {
	readonly code: EvaluationErrorCode;

	constructor(code: EvaluationErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "EvaluationCommandError";
	}
}

export function throwEvaluationError(
	code: EvaluationErrorCode,
	message: string,
): never {
	throw new EvaluationCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): EvaluationCommandResult {
	return evaluationCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		evaluationRecordId: snapshot.evaluationRecordId,
		evaluationScoreId: snapshot.evaluationScoreId,
	});
}
