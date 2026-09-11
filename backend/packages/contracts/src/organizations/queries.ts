import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	agencyStatusSchema,
	marketScopeSchema,
	membershipRoleSchema,
	membershipStatusSchema,
	onboardingStepSchema,
} from "./types";

export const agencyDtoSchema = z.object({
	id: institutionalUuidSchema,
	ownerPrincipalId: institutionalUuidSchema,
	displayName: z.string().min(1).max(200),
	marketScope: marketScopeSchema,
	status: agencyStatusSchema,
	onboardingStep: onboardingStepSchema,
	revision: z.number().int().nonnegative(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const membershipDtoSchema = z.object({
	id: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	principalId: institutionalUuidSchema.nullable(),
	role: membershipRoleSchema,
	status: membershipStatusSchema,
	invitedAt: z.string().datetime().optional(),
	joinedAt: z.string().datetime().optional(),
	revokedAt: z.string().datetime().optional(),
	revision: z.number().int().nonnegative(),
});

export const ownerDtoSchema = z.object({
	id: institutionalUuidSchema,
	principalId: institutionalUuidSchema,
	createdAt: z.string().datetime(),
});

export type AgencyDto = z.infer<typeof agencyDtoSchema>;
export type MembershipDto = z.infer<typeof membershipDtoSchema>;
export type OwnerDto = z.infer<typeof ownerDtoSchema>;
