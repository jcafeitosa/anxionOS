import { z } from "zod";
import { billingInvoiceIdSchema, billingInvoiceLineIdSchema, billingSubscriptionIdSchema, billingUsageAggregationIdSchema, billingPeriodSchema, } from "./types";
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

export type BillingCommandResult = z.infer<typeof billingCommandResultSchema>;

export type CreateSubscriptionCommand = z.infer<typeof createSubscriptionCommandSchema>;

export type IssueInvoiceCommand = z.infer<typeof issueInvoiceCommandSchema>;
