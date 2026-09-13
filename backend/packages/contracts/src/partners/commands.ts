import { z } from "zod";
import { billingInvoiceIdSchema } from "../billing/types";
import { institutionalUuidSchema } from "../institutional-uuid";
import { partnerReasonSchema, partnerReferenceSchema } from "./safe-text";
import {
	commissionRateSchema,
	decimalAmountSchema,
	partnersCommissionAccrualIdSchema,
	partnersPartnerIdSchema,
	partnersPayoutIdSchema,
	partnersPayoutStatusSchema,
	partnersReferralIdSchema,
} from "./types";
export const partnersCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	partnerId: partnersPartnerIdSchema.optional(),
	referralId: partnersReferralIdSchema.optional(),
	commissionAccrualId: partnersCommissionAccrualIdSchema.optional(),
	commissionAmount: decimalAmountSchema.optional(),
	payoutId: partnersPayoutIdSchema.optional(),
	payoutStatus: partnersPayoutStatusSchema.optional(),
});
export const registerPartnerCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	referralCode: partnersReferralIdSchema,
	displayName: z.string().min(1).max(256),
	commissionRate: commissionRateSchema,
	referredOrganizationId: institutionalUuidSchema,
});
export const accrueCommissionFromInvoiceCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	partnerOrganizationId: institutionalUuidSchema,
	invoiceId: billingInvoiceIdSchema,
	referredOrganizationId: institutionalUuidSchema,
	subscriptionId: z.string().min(1),
	billingPeriod: z.string().regex(/^\d{4}-\d{2}$/),
	totalAmount: decimalAmountSchema,
	paidAt: z.string().datetime(),
});
export const reverseCommissionFromInvoiceCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	refundId: institutionalUuidSchema.optional(),
	partnerOrganizationId: institutionalUuidSchema,
	invoiceId: billingInvoiceIdSchema,
	reversedAt: z.string().datetime(),
	reason: partnerReasonSchema.optional(),
});
export const requestPayoutCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	partnerOrganizationId: institutionalUuidSchema,
	partnerId: partnersPartnerIdSchema,
	requestedAt: z.string().datetime(),
});
export const approvePayoutCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	partnerOrganizationId: institutionalUuidSchema,
	payoutId: partnersPayoutIdSchema,
	approvedAt: z.string().datetime(),
	approvalReference: partnerReferenceSchema,
});
export const failPayoutCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	partnerOrganizationId: institutionalUuidSchema,
	payoutId: partnersPayoutIdSchema,
	failedAt: z.string().datetime(),
	failureReason: partnerReasonSchema,
});
export const retryPayoutCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	partnerOrganizationId: institutionalUuidSchema,
	payoutId: partnersPayoutIdSchema,
	processingAt: z.string().datetime(),
});
export const settlePayoutCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	partnerOrganizationId: institutionalUuidSchema,
	payoutId: partnersPayoutIdSchema,
	settledAt: z.string().datetime(),
	providerReference: partnerReferenceSchema,
});
export const reversePayoutCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	partnerOrganizationId: institutionalUuidSchema,
	payoutId: partnersPayoutIdSchema,
	reversedAt: z.string().datetime(),
	reversalReference: partnerReferenceSchema,
});

export type PartnersCommandResult = z.infer<typeof partnersCommandResultSchema>;

export type RegisterPartnerCommand = z.infer<
	typeof registerPartnerCommandSchema
>;

export type AccrueCommissionFromInvoiceCommand = z.infer<
	typeof accrueCommissionFromInvoiceCommandSchema
>;

export type ReverseCommissionFromInvoiceCommand = z.infer<
	typeof reverseCommissionFromInvoiceCommandSchema
>;

export type RequestPayoutCommand = z.infer<typeof requestPayoutCommandSchema>;

export type ApprovePayoutCommand = z.infer<typeof approvePayoutCommandSchema>;
export type FailPayoutCommand = z.infer<typeof failPayoutCommandSchema>;
export type RetryPayoutCommand = z.infer<typeof retryPayoutCommandSchema>;
export type SettlePayoutCommand = z.infer<typeof settlePayoutCommandSchema>;
export type ReversePayoutCommand = z.infer<typeof reversePayoutCommandSchema>;
