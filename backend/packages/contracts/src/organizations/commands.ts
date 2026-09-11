import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	marketScopeSchema,
	membershipRoleSchema,
	onboardingStepSchema,
} from "./types";
export const commandResultSchema = z.object({
	aggregateId: institutionalUuidSchema,
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
});
export const createAgencyCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	displayName: z.string().min(1).max(200),
	marketScope: marketScopeSchema,
});
export const updateAgencyMarketsCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	marketScope: marketScopeSchema,
});
export const advanceOnboardingCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	step: onboardingStepSchema,
});
export const inviteMemberCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	email: z.string().email(),
	role: membershipRoleSchema.exclude(["owner"]),
});
export const activateMembershipCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	membershipId: institutionalUuidSchema,
});
export const revokeMembershipCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	membershipId: institutionalUuidSchema,
});
export const acceptInviteByTokenCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	token: z.string().min(1),
});
export const transferOwnershipCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	newOwnerPrincipalId: institutionalUuidSchema,
});

export type CommandResult = z.infer<typeof commandResultSchema>;

export type CreateAgencyCommand = z.infer<typeof createAgencyCommandSchema>;
export type UpdateAgencyMarketsCommand = z.infer<
	typeof updateAgencyMarketsCommandSchema
>;
export type AdvanceOnboardingCommand = z.infer<
	typeof advanceOnboardingCommandSchema
>;
export type InviteMemberCommand = z.infer<typeof inviteMemberCommandSchema>;
export type ActivateMembershipCommand = z.infer<
	typeof activateMembershipCommandSchema
>;
export type RevokeMembershipCommand = z.infer<
	typeof revokeMembershipCommandSchema
>;
export type AcceptInviteByTokenCommand = z.infer<
	typeof acceptInviteByTokenCommandSchema
>;
export type TransferOwnershipCommand = z.infer<
	typeof transferOwnershipCommandSchema
>;
