import {
	getEvaluationRecord,
	getEvaluationScore,
	type EvaluationRecordView,
	type EvaluationScoreView,
} from "@anxionos/evaluation";
import type { EvaluationPluginDeps } from "../plugin";
import { evaluationRecordIdParamSchema } from "./certification-queries";

export { evaluationRecordIdParamSchema };

export async function handleGetEvaluationRecord(
	deps: EvaluationPluginDeps,
	input: { agencyId: string; evaluationRecordId: string },
): Promise<EvaluationRecordView> {
	return getEvaluationRecord(
		{ evaluationRecords: deps.evaluationRecords },
		input.agencyId,
		input.evaluationRecordId,
	);
}

export async function handleGetEvaluationScore(
	deps: EvaluationPluginDeps,
	input: { agencyId: string; evaluationRecordId: string },
): Promise<EvaluationScoreView> {
	return getEvaluationScore(
		{
			evaluationRecords: deps.evaluationRecords,
			evaluationScores: deps.evaluationScores,
		},
		input.agencyId,
		input.evaluationRecordId,
	);
}
