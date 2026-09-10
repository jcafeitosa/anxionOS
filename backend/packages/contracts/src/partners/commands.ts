import { z } from "zod";
import { billingInvoiceIdSchema } from "../billing/types";
import {
	commissionRateSchema,
	decimalAmountSchema,
	partnersCommissionAccrualIdSchema,
	partnersPartnerIdSchema,
	partnersPayoutIdSchema,
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
});
export const registerPartnerCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	referralCode: partnersReferralIdSchema,
	displayName: z.string().min(1).max(256),
	commissionRate: commissionRateSchema,
	referredOrganizationId: z.string().uuid(),
});
export const accrueCommissionFromInvoiceCommandSchema = z.object({
	commandId: z.string().uuid(),
	partnerOrganizationId: z.string().uuid(),
	invoiceId: billingInvoiceIdSchema,
	referredOrganizationId: z.string().uuid(),
	subscriptionId: z.string().min(1),
	billingPeriod: z.string().regex(/^\d{4}-\d{2}$/),
	totalAmount: decimalAmountSchema,
	issuedAt: z.string().datetime(),
});
export const reverseCommissionFromInvoiceCommandSchema = z.object({
	commandId: z.string().uuid(),
	partnerOrganizationId: z.string().uuid(),
	invoiceId: billingInvoiceIdSchema,
	reversedAt: z.string().datetime(),
	reason: z.string().min(1).max(256).optional(),
});
export const requestPayoutCommandSchema = z.object({
	commandId: z.string().uuid(),
	partnerOrganizationId: z.string().uuid(),
	partnerId: partnersPartnerIdSchema,
	requestedAt: z.string().datetime(),
});
export const approvePayoutCommandSchema = z.object({
	commandId: z.string().uuid(),
	partnerOrganizationId: z.string().uuid(),
	payoutId: partnersPayoutIdSchema,
	approvedAt: z.string().datetime(),
	approvalReference: z.string().min(1).max(128),
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
