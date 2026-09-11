import { z } from "zod";
import { performanceOutcomeSnapshotIdSchema } from "../performance/types";
import { strategyIdSchema, strategyVersionIdSchema } from "../strategies/types";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	decimalScoreSchema,
	evaluationCertificationIdSchema,
	evaluationRecordIdSchema,
	evaluationScoreIdSchema,
} from "./types";
export const EVALUATION_EVENT_TYPES = {
	SCORE_COMPUTED: "evaluation.score.computed.v1",
	CERTIFICATION_ISSUED: "evaluation.certification.issued.v1",
};
export const scoreComputedPayloadSchema = z.object({
	evaluationRecordId: evaluationRecordIdSchema,
	evaluationScoreId: evaluationScoreIdSchema,
	organizationId: institutionalUuidSchema,
	outcomeSnapshotId: performanceOutcomeSnapshotIdSchema,
	scoreMetric: z.string().min(1).max(64),
	scoreValue: decimalScoreSchema,
	computedAt: z.string().datetime(),
});
export const certificationSubjectTypeSchema = z.enum(["strategy_version"]);
export const certificationIssuedPayloadSchema = z.object({
	certificationId: evaluationCertificationIdSchema,
	organizationId: institutionalUuidSchema,
	subjectType: certificationSubjectTypeSchema,
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
	evaluationRecordId: evaluationRecordIdSchema.optional(),
	policyHash: z
		.string()
		.regex(/^[a-f0-9]{64}$/i)
		.optional(),
	issuedAt: z.string().datetime(),
});
export const evaluationEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(EVALUATION_EVENT_TYPES.SCORE_COMPUTED),
		payload: scoreComputedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(EVALUATION_EVENT_TYPES.CERTIFICATION_ISSUED),
		payload: certificationIssuedPayloadSchema,
	}),
]);

export type EvaluationEventType =
	(typeof EVALUATION_EVENT_TYPES)[keyof typeof EVALUATION_EVENT_TYPES];
