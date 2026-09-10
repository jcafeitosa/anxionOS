import { z } from "zod";
import { performanceOutcomeSnapshotIdSchema } from "../performance/types";
import {
	decimalScoreSchema,
	evaluationRecordIdSchema,
	evaluationScoreIdSchema,
} from "./types";
export const EVALUATION_EVENT_TYPES = {
	SCORE_COMPUTED: "evaluation.score.computed.v1",
};
export const scoreComputedPayloadSchema = z.object({
	evaluationRecordId: evaluationRecordIdSchema,
	evaluationScoreId: evaluationScoreIdSchema,
	organizationId: z.string().uuid(),
	outcomeSnapshotId: performanceOutcomeSnapshotIdSchema,
	scoreMetric: z.string().min(1).max(64),
	scoreValue: decimalScoreSchema,
	computedAt: z.string().datetime(),
});
export const evaluationEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(EVALUATION_EVENT_TYPES.SCORE_COMPUTED),
		payload: scoreComputedPayloadSchema,
	}),
]);

export type EvaluationEventType =
	(typeof EVALUATION_EVENT_TYPES)[keyof typeof EVALUATION_EVENT_TYPES];
