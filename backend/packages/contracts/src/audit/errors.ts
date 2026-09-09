import { z } from "zod";
export const AUDIT_ERROR_CODES = {
    DUPLICATE_IDEMPOTENCY: "AUD_DUPLICATE_IDEMPOTENCY",
    CROSS_TENANT: "AUD_CROSS_TENANT",
    MANIFEST_NOT_FOUND: "AUD_MANIFEST_NOT_FOUND",
};
export const auditErrorCodeSchema = z.enum(Object.values(AUDIT_ERROR_CODES) as [string, ...string[]]);
export const AUDIT_ERROR_STATUS_MAP = {
    AUD_DUPLICATE_IDEMPOTENCY: 409,
    AUD_CROSS_TENANT: 403,
    AUD_MANIFEST_NOT_FOUND: 404,
};
export type AuditErrorCode = (typeof AUDIT_ERROR_CODES)[keyof typeof AUDIT_ERROR_CODES];
export function resolveAuditErrorStatus(code: AuditErrorCode): number {
    return AUDIT_ERROR_STATUS_MAP[code as keyof typeof AUDIT_ERROR_STATUS_MAP];
}
