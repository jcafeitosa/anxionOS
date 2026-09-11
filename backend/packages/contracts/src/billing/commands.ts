import { z } from "zod";

/** ANX-444 NOT_APPLICABLE (ANX-223): billing UUID fields remain z.string().uuid() until Owner greenlight. */
import {
	billingInvoiceIdSchema,
	billingInvoiceLineIdSchema,
	billingPeriodSchema,
	billingSubscriptionIdSchema,
	billingUsageAggregationIdSchema,
	decimalAmountSchema,
} from "./types";
export const billingCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	subscriptionId: billingSubscriptionIdSchema.optional(),
	invoiceId: billingInvoiceIdSchema.optional(),
	lineId: billingInvoiceLineIdSchema.optional(),
	usageAggregationId: billingUsageAggregationIdSchema.optional(),
});
export const createSubscriptionCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	planCode: z.string().min(1).max(64),
	billingPeriodStart: z.string().datetime(),
	billingPeriodEnd: z.string().datetime(),
});
export const issueInvoiceCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	subscriptionId: billingSubscriptionIdSchema,
	invoiceId: billingInvoiceIdSchema.optional(),
});
export const cancelSubscriptionCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	subscriptionId: billingSubscriptionIdSchema,
	cancelledAt: z.string().datetime(),
	reason: z.string().min(1).max(256).optional(),
});
export const processRefundCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	subscriptionId: billingSubscriptionIdSchema,
	invoiceId: billingInvoiceIdSchema,
	refundAmount: decimalAmountSchema,
	refundedAt: z.string().datetime(),
	reason: z.string().min(1).max(256).optional(),
});
export const billingWebhookEventTypeSchema = z.enum([
	"invoice.payment_succeeded",
	"invoice.payment_failed",
	"subscription.cancelled",
]);
export const processBillingWebhookCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	webhookEventId: z.string().min(1).max(128),
	eventType: billingWebhookEventTypeSchema,
	occurredAt: z.string().datetime(),
	subscriptionId: billingSubscriptionIdSchema.optional(),
	invoiceId: billingInvoiceIdSchema.optional(),
});

export type BillingCommandResult = z.infer<typeof billingCommandResultSchema>;

export type CreateSubscriptionCommand = z.infer<
	typeof createSubscriptionCommandSchema
>;

export type IssueInvoiceCommand = z.infer<typeof issueInvoiceCommandSchema>;

export type CancelSubscriptionCommand = z.infer<
	typeof cancelSubscriptionCommandSchema
>;

export type ProcessRefundCommand = z.infer<typeof processRefundCommandSchema>;

export type ProcessBillingWebhookCommand = z.infer<
	typeof processBillingWebhookCommandSchema
>;
