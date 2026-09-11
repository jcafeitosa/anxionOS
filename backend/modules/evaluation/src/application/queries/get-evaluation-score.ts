import type {
	EvaluationRecordRepository,
	EvaluationScoreRepository,
} from "../../domain/ports/evaluation-unit-of-work";
import { throwEvaluationError } from "../errors";
import {
	type EvaluationScoreView,
	toEvaluationScoreView,
} from "./query-support";

export interface GetEvaluationScoreDeps {
	evaluationRecords: EvaluationRecordRepository;
	evaluationScores: EvaluationScoreRepository;
}

export async function getEvaluationScore(
	deps: GetEvaluationScoreDeps,
	organizationId: string,
	evaluationRecordId: string,
): Promise<EvaluationScoreView> {
	const record = await deps.evaluationRecords.findById(evaluationRecordId);
	if (!record) {
		throwEvaluationError(
			"EVL_RECORD_NOT_FOUND",
			`evaluation record ${evaluationRecordId} not found`,
		);
	}
	if (record.organizationId !== organizationId) {
		throwEvaluationError(
			"EVL_CROSS_TENANT",
			"evaluation record organization mismatch",
		);
	}
	const score =
		await deps.evaluationScores.findByEvaluationRecordId(evaluationRecordId);
	if (!score) {
		throwEvaluationError(
			"EVL_SCORE_NOT_FOUND",
			`evaluation score for record ${evaluationRecordId} not found`,
		);
	}
	if (score.organizationId !== organizationId) {
		throwEvaluationError(
			"EVL_CROSS_TENANT",
			"evaluation score organization mismatch",
		);
	}
	return toEvaluationScoreView(score);
}
