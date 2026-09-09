import { z } from "zod";
import { marketScopeSchema, membershipRoleSchema, onboardingStepSchema, } from "./types";
export const commandResultSchema = z.object({
    aggregateId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    idempotentReplay: z.boolean().optional(),
});
export const createAgencyCommandSchema = z.object({
    commandId: z.string().uuid(),
    displayName: z.string().min(1).max(200),
    marketScope: marketScopeSchema,
});
export const updateAgencyMarketsCommandSchema = z.object({
    commandId: z.string().uuid(),
    agencyId: z.string().uuid(),
    marketScope: marketScopeSchema,
});
export const advanceOnboardingCommandSchema = z.object({
    commandId: z.string().uuid(),
    agencyId: z.string().uuid(),
    step: onboardingStepSchema,
});
export const inviteMemberCommandSchema = z.object({
    commandId: z.string().uuid(),
    agencyId: z.string().uuid(),
    email: z.string().email(),
    role: membershipRoleSchema.exclude(["owner"]),
});
export const activateMembershipCommandSchema = z.object({
    commandId: z.string().uuid(),
    agencyId: z.string().uuid(),
    membershipId: z.string().uuid(),
});
export const revokeMembershipCommandSchema = z.object({
    commandId: z.string().uuid(),
    agencyId: z.string().uuid(),
    membershipId: z.string().uuid(),
});
export const acceptInviteByTokenCommandSchema = z.object({
    commandId: z.string().uuid(),
    token: z.string().min(1),
});

export type CommandResult = z.infer<typeof commandResultSchema>;

export type CreateAgencyCommand = z.infer<typeof createAgencyCommandSchema>;
export type UpdateAgencyMarketsCommand = z.infer<typeof updateAgencyMarketsCommandSchema>;
export type AdvanceOnboardingCommand = z.infer<typeof advanceOnboardingCommandSchema>;
export type InviteMemberCommand = z.infer<typeof inviteMemberCommandSchema>;
export type ActivateMembershipCommand = z.infer<typeof activateMembershipCommandSchema>;
export type RevokeMembershipCommand = z.infer<typeof revokeMembershipCommandSchema>;
export type AcceptInviteByTokenCommand = z.infer<typeof acceptInviteByTokenCommandSchema>;
