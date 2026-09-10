import { z } from "zod";
import {
	commissionRateSchema,
	partnersCommissionAccrualIdSchema,
	partnersPartnerIdSchema,
	partnersReferralIdSchema,
} from "./types";
export const partnersCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	partnerId: partnersPartnerIdSchema.optional(),
	referralId: partnersReferralIdSchema.optional(),
	commissionAccrualId: partnersCommissionAccrualIdSchema.optional(),
	commissionAmount: z.string().optional(),
});
export const registerPartnerCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	referralCode: partnersReferralIdSchema,
	displayName: z.string().min(1).max(256),
	commissionRate: commissionRateSchema,
	referredOrganizationId: z.string().uuid(),
});

export type PartnersCommandResult = z.infer<typeof partnersCommandResultSchema>;

export type RegisterPartnerCommand = z.infer<
	typeof registerPartnerCommandSchema
>;
