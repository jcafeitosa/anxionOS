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
	partnersReferralIdSchema,
} from "./types";
export const PARTNERS_EVENT_TYPES = {
	COMMISSION_ACCRUED: "partners.commission.accrued.v1",
	COMMISSION_REVERSED: "partners.commission.reversed.v1",
	PAYOUT_REQUESTED: "partners.payout.requested.v1",
	PAYOUT_APPROVED: "partners.payout.approved.v1",
	PAYOUT_SCHEDULED: "partners.payout.scheduled.v1",
	PAYOUT_PROCESSING: "partners.payout.processing.v1",
	PAYOUT_SETTLED: "partners.payout.settled.v1",
	PAYOUT_FAILED: "partners.payout.failed.v1",
	PAYOUT_REVERSED: "partners.payout.reversed.v1",
};
export const commissionAccruedPayloadSchema = z.object({
	commissionAccrualId: partnersCommissionAccrualIdSchema,
	partnerId: partnersPartnerIdSchema,
	organizationId: institutionalUuidSchema,
	referralId: partnersReferralIdSchema,
	referredOrganizationId: institutionalUuidSchema,
	invoiceId: billingInvoiceIdSchema,
	invoiceTotalAmount: decimalAmountSchema,
	commissionRate: commissionRateSchema,
	commissionAmount: decimalAmountSchema,
	accruedAt: z.string().datetime(),
});
export const commissionReversedPayloadSchema = z.object({
	commissionAccrualId: partnersCommissionAccrualIdSchema,
	partnerId: partnersPartnerIdSchema,
	organizationId: institutionalUuidSchema,
	invoiceId: billingInvoiceIdSchema,
	reversedAmount: decimalAmountSchema,
	reversedAt: z.string().datetime(),
});
export const payoutRequestedPayloadSchema = z.object({
	payoutId: partnersPayoutIdSchema,
	partnerId: partnersPartnerIdSchema,
	organizationId: institutionalUuidSchema,
	requestedAmount: decimalAmountSchema,
	requestedAt: z.string().datetime(),
});
export const payoutApprovedPayloadSchema = z.object({
	payoutId: partnersPayoutIdSchema,
	partnerId: partnersPartnerIdSchema,
	organizationId: institutionalUuidSchema,
	approvedAmount: decimalAmountSchema,
	approvalReference: partnerReferenceSchema,
	approvedAt: z.string().datetime(),
});
export const payoutScheduledPayloadSchema = payoutRequestedPayloadSchema;
export const payoutProcessingPayloadSchema = z.object({
	payoutId: partnersPayoutIdSchema,
	partnerId: partnersPartnerIdSchema,
	organizationId: institutionalUuidSchema,
	processingAt: z.string().datetime(),
	attemptNumber: z.number().int().positive(),
});
export const payoutSettledPayloadSchema = z.object({
	payoutId: partnersPayoutIdSchema,
	partnerId: partnersPartnerIdSchema,
	organizationId: institutionalUuidSchema,
	settledAmount: decimalAmountSchema,
	providerReference: partnerReferenceSchema,
	settledAt: z.string().datetime(),
});
export const payoutFailedPayloadSchema = z.object({
	payoutId: partnersPayoutIdSchema,
	partnerId: partnersPartnerIdSchema,
	organizationId: institutionalUuidSchema,
	failureReason: partnerReasonSchema,
	attemptNumber: z.number().int().positive(),
	failedAt: z.string().datetime(),
});
export const payoutReversedPayloadSchema = z.object({
	payoutId: partnersPayoutIdSchema,
	partnerId: partnersPartnerIdSchema,
	organizationId: institutionalUuidSchema,
	reversalReference: partnerReferenceSchema,
	reversedAt: z.string().datetime(),
});
export const partnersEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(PARTNERS_EVENT_TYPES.COMMISSION_ACCRUED),
		payload: commissionAccruedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PARTNERS_EVENT_TYPES.COMMISSION_REVERSED),
		payload: commissionReversedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PARTNERS_EVENT_TYPES.PAYOUT_REQUESTED),
		payload: payoutRequestedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PARTNERS_EVENT_TYPES.PAYOUT_APPROVED),
		payload: payoutApprovedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PARTNERS_EVENT_TYPES.PAYOUT_SCHEDULED),
		payload: payoutScheduledPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PARTNERS_EVENT_TYPES.PAYOUT_PROCESSING),
		payload: payoutProcessingPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PARTNERS_EVENT_TYPES.PAYOUT_SETTLED),
		payload: payoutSettledPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PARTNERS_EVENT_TYPES.PAYOUT_FAILED),
		payload: payoutFailedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PARTNERS_EVENT_TYPES.PAYOUT_REVERSED),
		payload: payoutReversedPayloadSchema,
	}),
]);

export type PartnersEventType =
	(typeof PARTNERS_EVENT_TYPES)[keyof typeof PARTNERS_EVENT_TYPES];
