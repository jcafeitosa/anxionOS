import type { EvaluationRecordRepository } from "../../domain/ports/evaluation-unit-of-work";
import { throwEvaluationError } from "../errors";
import { toEvaluationRecordView, type EvaluationRecordView } from "./query-support";

export interface GetEvaluationRecordDeps {
	evaluationRecords: EvaluationRecordRepository;
}

export async function getEvaluationRecord(
	deps: GetEvaluationRecordDeps,
	organizationId: string,
	evaluationRecordId: string,
): Promise<EvaluationRecordView> {
	const row = await deps.evaluationRecords.findById(evaluationRecordId);
	if (!row) {
		throwEvaluationError(
			"EVL_RECORD_NOT_FOUND",
			`evaluation record ${evaluationRecordId} not found`,
		);
	}
	if (row.organizationId !== organizationId) {
		throwEvaluationError(
			"EVL_CROSS_TENANT",
			"evaluation record organization mismatch",
		);
	}
	return toEvaluationRecordView(row);
}
