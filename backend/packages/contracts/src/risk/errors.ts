import { z } from "zod";
export const RISK_ERROR_CODES = {
    CROSS_TENANT: "RK_CROSS_TENANT",
    CONFIG_REQUIRED: "RK_CONFIG_REQUIRED",
    PERMIT_STALE: "RK_PERMIT_STALE",
    LIMIT_EXCEEDED: "RK_LIMIT_EXCEEDED",
    REAL_MODE_REJECTED: "RK_REAL_MODE_REJECTED",
    POLICY_NOT_FOUND: "RK_POLICY_NOT_FOUND",
};
export const riskErrorCodeSchema = z.enum(Object.values(RISK_ERROR_CODES) as [string, ...string[]]);
export const RISK_ERROR_STATUS_MAP = {
    RK_CROSS_TENANT: 403,
    RK_CONFIG_REQUIRED: 422,
    RK_PERMIT_STALE: 409,
    RK_LIMIT_EXCEEDED: 422,
    RK_REAL_MODE_REJECTED: 422,
    RK_POLICY_NOT_FOUND: 404,
};
export type RiskErrorCode = (typeof RISK_ERROR_CODES)[keyof typeof RISK_ERROR_CODES];
export function resolveRiskErrorStatus(code: RiskErrorCode): number {
    return RISK_ERROR_STATUS_MAP[code as keyof typeof RISK_ERROR_STATUS_MAP];
}
