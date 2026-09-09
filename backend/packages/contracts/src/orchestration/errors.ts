import { z } from "zod";
export const ORCHESTRATION_ERROR_CODES = [
    "ORC_TASK_NOT_FOUND",
    "ORC_RUN_NOT_FOUND",
    "ORC_GOAL_NOT_FOUND",
    "ORC_LEASE_CONFLICT",
    "ORC_LEASE_EXPIRED",
    "ORC_CHECKOUT_DENIED",
    "ORC_GATE_REVIEWER_MISMATCH",
    "ORC_GATE_DIGEST_REQUIRED",
    "ORC_GATE_NA_REASON_REQUIRED",
    "ORC_MIRROR_REJECTED",
    "ORC_WEBHOOK_UNAUTHORIZED",
    "ORC_IDEMPOTENT_REPLAY",
    "ORC_SCOPE_DENIED",
    "ORC_GOVERNANCE_UNAVAILABLE",
    "ORC_IDENTITY_UNAVAILABLE",
    "ORC_HEARTBEAT_BACKPRESSURE",
] as const;
export const orchestrationErrorCodeSchema = z.enum(ORCHESTRATION_ERROR_CODES);
export const ORCHESTRATION_ERROR_STATUS_MAP = {
    ORC_TASK_NOT_FOUND: 404,
    ORC_RUN_NOT_FOUND: 404,
    ORC_GOAL_NOT_FOUND: 404,
    ORC_LEASE_CONFLICT: 409,
    ORC_LEASE_EXPIRED: 409,
    ORC_CHECKOUT_DENIED: 409,
    ORC_GATE_REVIEWER_MISMATCH: 403,
    ORC_GATE_DIGEST_REQUIRED: 400,
    ORC_GATE_NA_REASON_REQUIRED: 400,
    ORC_MIRROR_REJECTED: 409,
    ORC_WEBHOOK_UNAUTHORIZED: 401,
    ORC_IDEMPOTENT_REPLAY: 200,
    ORC_SCOPE_DENIED: 403,
    ORC_GOVERNANCE_UNAVAILABLE: 503,
    ORC_IDENTITY_UNAVAILABLE: 503,
    ORC_HEARTBEAT_BACKPRESSURE: 429,
};
export const orchestrationErrorDetailsSchema = z.object({
    code: orchestrationErrorCodeSchema,
    message: z.string().optional(),
});
export type OrchestrationErrorCode = (typeof ORCHESTRATION_ERROR_CODES)[number];
export function resolveOrchestrationErrorStatus(code: OrchestrationErrorCode): number {
    return ORCHESTRATION_ERROR_STATUS_MAP[code as keyof typeof ORCHESTRATION_ERROR_STATUS_MAP];
}

export type OrchestrationErrorDetails = z.infer<typeof orchestrationErrorDetailsSchema>;
