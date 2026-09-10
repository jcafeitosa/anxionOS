import { z } from "zod";
export const BILLING_ERROR_CODES = {
	DUPLICATE_IDEMPOTENCY: "BIL_DUPLICATE_IDEMPOTENCY",
	CROSS_TENANT: "BIL_CROSS_TENANT",
	SUBSCRIPTION_NOT_FOUND: "BIL_SUBSCRIPTION_NOT_FOUND",
	INVOICE_NOT_FOUND: "BIL_INVOICE_NOT_FOUND",
};
export const billingErrorCodeSchema = z.enum(
	Object.values(BILLING_ERROR_CODES) as [string, ...string[]],
);
export const BILLING_ERROR_STATUS_MAP = {
	BIL_DUPLICATE_IDEMPOTENCY: 409,
	BIL_CROSS_TENANT: 403,
	BIL_SUBSCRIPTION_NOT_FOUND: 404,
	BIL_INVOICE_NOT_FOUND: 404,
};
export type BillingErrorCode =
	(typeof BILLING_ERROR_CODES)[keyof typeof BILLING_ERROR_CODES];
export function resolveBillingErrorStatus(code: BillingErrorCode): number {
	return BILLING_ERROR_STATUS_MAP[
		code as keyof typeof BILLING_ERROR_STATUS_MAP
	];
}
