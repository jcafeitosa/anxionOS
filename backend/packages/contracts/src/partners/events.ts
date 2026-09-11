import { z } from "zod";
import { billingInvoiceIdSchema } from "../billing/types";
import { institutionalUuidSchema } from "../institutional-uuid";
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
	approvalReference: z.string().min(1).max(128),
	approvedAt: z.string().datetime(),
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
]);

export type PartnersEventType =
	(typeof PARTNERS_EVENT_TYPES)[keyof typeof PARTNERS_EVENT_TYPES];
