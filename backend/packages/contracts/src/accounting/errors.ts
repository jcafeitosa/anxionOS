import { z } from "zod";
export const ACCOUNTING_ERROR_CODES = {
    UNBALANCED_ENTRY: "ACC_UNBALANCED_ENTRY",
    DUPLICATE_IDEMPOTENCY: "ACC_DUPLICATE_IDEMPOTENCY",
    CROSS_TENANT: "ACC_CROSS_TENANT",
    REAL_MODE_REJECTED: "ACC_REAL_MODE_REJECTED",
    ACCOUNT_NOT_FOUND: "ACC_ACCOUNT_NOT_FOUND",
    ENTRY_NOT_FOUND: "ACC_ENTRY_NOT_FOUND",
};
export const accountingErrorCodeSchema = z.enum(Object.values(ACCOUNTING_ERROR_CODES) as [string, ...string[]]);
export const ACCOUNTING_ERROR_STATUS_MAP = {
    ACC_UNBALANCED_ENTRY: 422,
    ACC_DUPLICATE_IDEMPOTENCY: 409,
    ACC_CROSS_TENANT: 403,
    ACC_REAL_MODE_REJECTED: 422,
    ACC_ACCOUNT_NOT_FOUND: 404,
    ACC_ENTRY_NOT_FOUND: 404,
};
export type AccountingErrorCode = (typeof ACCOUNTING_ERROR_CODES)[keyof typeof ACCOUNTING_ERROR_CODES];
export function resolveAccountingErrorStatus(code: AccountingErrorCode): number {
    return ACCOUNTING_ERROR_STATUS_MAP[code as keyof typeof ACCOUNTING_ERROR_STATUS_MAP];
}
