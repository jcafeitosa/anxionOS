import { z } from "zod";
import {
	billingInvoiceIdSchema,
	billingPeriodSchema,
	billingSubscriptionIdSchema,
	decimalAmountSchema,
} from "./types";
export const BILLING_EVENT_TYPES = {
	INVOICE_ISSUED: "billing.invoice.issued.v1",
	SUBSCRIPTION_CANCELLED: "billing.subscription.cancelled.v1",
	INVOICE_REFUNDED: "billing.invoice.refunded.v1",
	WEBHOOK_PROCESSED: "billing.webhook.processed.v1",
};
export const invoiceIssuedPayloadSchema = z.object({
	invoiceId: billingInvoiceIdSchema,
	organizationId: z.string().uuid(),
	subscriptionId: billingSubscriptionIdSchema,
	billingPeriod: billingPeriodSchema,
	totalAmount: decimalAmountSchema,
	issuedAt: z.string().datetime(),
});
export const subscriptionCancelledPayloadSchema = z.object({
	subscriptionId: billingSubscriptionIdSchema,
	organizationId: z.string().uuid(),
	cancelledAt: z.string().datetime(),
	reason: z.string().optional(),
});
export const invoiceRefundedPayloadSchema = z.object({
	invoiceId: billingInvoiceIdSchema,
	organizationId: z.string().uuid(),
	subscriptionId: billingSubscriptionIdSchema,
	refundAmount: decimalAmountSchema,
	refundedAt: z.string().datetime(),
	reason: z.string().optional(),
});
export const webhookProcessedPayloadSchema = z.object({
	webhookEventId: z.string().min(1),
	organizationId: z.string().uuid(),
	eventType: z.string().min(1),
	occurredAt: z.string().datetime(),
});
export const billingEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(BILLING_EVENT_TYPES.INVOICE_ISSUED),
		payload: invoiceIssuedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(BILLING_EVENT_TYPES.SUBSCRIPTION_CANCELLED),
		payload: subscriptionCancelledPayloadSchema,
	}),
	z.object({
		eventType: z.literal(BILLING_EVENT_TYPES.INVOICE_REFUNDED),
		payload: invoiceRefundedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(BILLING_EVENT_TYPES.WEBHOOK_PROCESSED),
		payload: webhookProcessedPayloadSchema,
	}),
]);

export type BillingEventType =
	(typeof BILLING_EVENT_TYPES)[keyof typeof BILLING_EVENT_TYPES];
