import { z } from "zod";
export const PARTNERS_OWNER_DOMAIN = "partners";
export const partnersPartnerIdSchema = z.string().regex(/^ptr_prt_[0-9a-f-]{36}$/i);
export const partnersReferralIdSchema = z.string().min(1).max(64);
export const partnersCommissionAccrualIdSchema = z.string().regex(/^ptr_acc_[0-9a-f-]{36}$/i);
export const partnersPartnerStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);
export const commissionRateSchema = z.string().regex(/^\d+(\.\d+)?$/);
export const decimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);

export type PartnersPartnerId = z.infer<typeof partnersPartnerIdSchema>;
export type PartnersReferralId = z.infer<typeof partnersReferralIdSchema>;
export type PartnersCommissionAccrualId = z.infer<typeof partnersCommissionAccrualIdSchema>;
export type PartnersPartnerStatus = z.infer<typeof partnersPartnerStatusSchema>;
