import { z } from "zod";
export const EVALUATION_ERROR_CODES = {
    DUPLICATE_IDEMPOTENCY: "EVL_DUPLICATE_IDEMPOTENCY",
    CROSS_TENANT: "EVL_CROSS_TENANT",
    RECORD_NOT_FOUND: "EVL_RECORD_NOT_FOUND",
};
export const evaluationErrorCodeSchema = z.enum(Object.values(EVALUATION_ERROR_CODES) as [string, ...string[]]);
export const EVALUATION_ERROR_STATUS_MAP = {
    EVL_DUPLICATE_IDEMPOTENCY: 409,
    EVL_CROSS_TENANT: 403,
    EVL_RECORD_NOT_FOUND: 404,
};
export type EvaluationErrorCode = (typeof EVALUATION_ERROR_CODES)[keyof typeof EVALUATION_ERROR_CODES];
export function resolveEvaluationErrorStatus(code: EvaluationErrorCode): number {
    return EVALUATION_ERROR_STATUS_MAP[code as keyof typeof EVALUATION_ERROR_STATUS_MAP];
}
