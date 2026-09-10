import { z } from "zod";
import {
	billingInvoiceIdSchema,
	billingPeriodSchema,
	billingSubscriptionIdSchema,
	decimalAmountSchema,
} from "./types";
export const BILLING_EVENT_TYPES = {
	INVOICE_ISSUED: "billing.invoice.issued.v1",
};
export const invoiceIssuedPayloadSchema = z.object({
	invoiceId: billingInvoiceIdSchema,
	organizationId: z.string().uuid(),
	subscriptionId: billingSubscriptionIdSchema,
	billingPeriod: billingPeriodSchema,
	totalAmount: decimalAmountSchema,
	issuedAt: z.string().datetime(),
});
export const billingEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(BILLING_EVENT_TYPES.INVOICE_ISSUED),
		payload: invoiceIssuedPayloadSchema,
	}),
]);

export type BillingEventType =
	(typeof BILLING_EVENT_TYPES)[keyof typeof BILLING_EVENT_TYPES];
