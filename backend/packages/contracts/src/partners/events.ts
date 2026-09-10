import { z } from "zod";
import { billingInvoiceIdSchema } from "../billing/types";
import {
	decimalAmountSchema,
	partnersCommissionAccrualIdSchema,
	partnersPartnerIdSchema,
	partnersReferralIdSchema,
} from "./types";
export const PARTNERS_EVENT_TYPES = {
	COMMISSION_ACCRUED: "partners.commission.accrued.v1",
};
export const commissionAccruedPayloadSchema = z.object({
	commissionAccrualId: partnersCommissionAccrualIdSchema,
	partnerId: partnersPartnerIdSchema,
	organizationId: z.string().uuid(),
	referralId: partnersReferralIdSchema,
	referredOrganizationId: z.string().uuid(),
	invoiceId: billingInvoiceIdSchema,
	invoiceTotalAmount: decimalAmountSchema,
	commissionRate: z.string().regex(/^\d+(\.\d+)?$/),
	commissionAmount: decimalAmountSchema,
	accruedAt: z.string().datetime(),
});
export const partnersEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(PARTNERS_EVENT_TYPES.COMMISSION_ACCRUED),
		payload: commissionAccruedPayloadSchema,
	}),
]);

export type PartnersEventType =
	(typeof PARTNERS_EVENT_TYPES)[keyof typeof PARTNERS_EVENT_TYPES];
