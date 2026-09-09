import { z } from "zod";
export const DECISIONS_ERROR_CODES = {
    CROSS_TENANT: "DC_CROSS_TENANT",
    AUTHORITY_STALE: "DC_AUTHORITY_STALE",
    INTENT_IMMUTABLE: "DC_INTENT_IMMUTABLE",
    REAL_MODE_REJECTED: "DC_REAL_MODE_REJECTED",
    DECISION_NOT_FOUND: "DC_DECISION_NOT_FOUND",
};
export const decisionsErrorCodeSchema = z.enum(Object.values(DECISIONS_ERROR_CODES) as [string, ...string[]]);
export const DECISIONS_ERROR_STATUS_MAP = {
    DC_CROSS_TENANT: 403,
    DC_AUTHORITY_STALE: 409,
    DC_INTENT_IMMUTABLE: 409,
    DC_REAL_MODE_REJECTED: 422,
    DC_DECISION_NOT_FOUND: 404,
};
export type DecisionsErrorCode = (typeof DECISIONS_ERROR_CODES)[keyof typeof DECISIONS_ERROR_CODES];
export function resolveDecisionsErrorStatus(code: DecisionsErrorCode): number {
    return DECISIONS_ERROR_STATUS_MAP[code as keyof typeof DECISIONS_ERROR_STATUS_MAP];
}
