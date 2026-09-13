import { z } from "zod";
import {
	isPartnerTextFreeOfSecrets,
	PARTNER_SECRET_REJECTION_MESSAGE,
} from "./safe-text";
export const PARTNERS_OWNER_DOMAIN = "partners";
export const partnersPartnerIdSchema = z
	.string()
	.regex(/^ptr_prt_[0-9a-f-]{36}$/i);
export const partnersReferralIdSchema = z
	.string()
	.min(1)
	.max(64)
	.refine(isPartnerTextFreeOfSecrets, {
		message: PARTNER_SECRET_REJECTION_MESSAGE,
	});
export const partnersCommissionAccrualIdSchema = z
	.string()
	.regex(/^ptr_acc_[0-9a-f-]{36}$/i);
export const partnersPayoutIdSchema = z
	.string()
	.regex(/^ptr_pay_[0-9a-f-]{36}$/i);
export const partnersPartnerStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);
export const partnersPayoutStatusSchema = z.enum([
	"SCHEDULED",
	"PROCESSING",
	"SETTLED",
	"FAILED",
	"REVERSED",
]);
export const partnersAccrualStatusSchema = z.enum([
	"ACCRUED",
	"REVERSED",
	"PAID",
]);
export const commissionRateSchema = z.string().regex(/^\d+(\.\d+)?$/);
export const decimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);

export type PartnersPartnerId = z.infer<typeof partnersPartnerIdSchema>;
export type PartnersReferralId = z.infer<typeof partnersReferralIdSchema>;
export type PartnersCommissionAccrualId = z.infer<
	typeof partnersCommissionAccrualIdSchema
>;
export type PartnersPayoutId = z.infer<typeof partnersPayoutIdSchema>;
export type PartnersPartnerStatus = z.infer<typeof partnersPartnerStatusSchema>;
export type PartnersPayoutStatus = z.infer<typeof partnersPayoutStatusSchema>;
export type PartnersAccrualStatus = z.infer<typeof partnersAccrualStatusSchema>;
