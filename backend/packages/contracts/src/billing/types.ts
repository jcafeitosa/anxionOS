import { z } from "zod";
export const BILLING_OWNER_DOMAIN = "billing";
export const billingSubscriptionIdSchema = z
	.string()
	.regex(/^bil_sub_[0-9a-f-]{36}$/i);
export const billingInvoiceIdSchema = z
	.string()
	.regex(/^bil_inv_[0-9a-f-]{36}$/i);
export const billingInvoiceLineIdSchema = z
	.string()
	.regex(/^bil_line_[0-9a-f-]{36}$/i);
export const billingUsageAggregationIdSchema = z
	.string()
	.regex(/^bil_uag_[0-9a-f-]{36}$/i);
export const billingSubscriptionStatusSchema = z.enum(["ACTIVE", "CANCELLED"]);
export const billingInvoiceStatusSchema = z.enum(["DRAFT", "ISSUED"]);
export const billingPeriodSchema = z.string().regex(/^\d{4}-\d{2}$/);
export const decimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);

export type BillingSubscriptionStatus = z.infer<
	typeof billingSubscriptionStatusSchema
>;
export type BillingInvoiceStatus = z.infer<typeof billingInvoiceStatusSchema>;
