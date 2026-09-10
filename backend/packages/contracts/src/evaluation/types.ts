import { z } from "zod";
export const EVALUATION_OWNER_DOMAIN = "evaluation";
export const evaluationRecordIdSchema = z
	.string()
	.regex(/^evl_rec_[0-9a-f-]{36}$/i);
export const evaluationScoreIdSchema = z
	.string()
	.regex(/^evl_scr_[0-9a-f-]{36}$/i);
export const decimalScoreSchema = z.string().regex(/^\d+(\.\d+)?$/);

export type EvaluationRecordId = z.infer<typeof evaluationRecordIdSchema>;
export type EvaluationScoreId = z.infer<typeof evaluationScoreIdSchema>;
