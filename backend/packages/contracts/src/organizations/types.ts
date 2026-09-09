import { z } from "zod";
export const agencyStatusSchema = z.enum([
    "draft",
    "connections_pending",
    "ready",
    "draining",
    "archived",
]);
export const marketScopeSchema = z.enum(["stocks", "crypto", "both"]);
export const onboardingStepSchema = z.enum([
    "created",
    "markets_set",
    "blueprint_pending",
    "mandate_pending",
    "ready",
]);
export const membershipRoleSchema = z.enum([
    "owner",
    "admin",
    "operator",
    "viewer",
]);
export const membershipStatusSchema = z.enum([
    "invited",
    "active",
    "revoked",
]);

export type AgencyStatus = z.infer<typeof agencyStatusSchema>;
export type MarketScope = z.infer<typeof marketScopeSchema>;
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;
export type MembershipRole = z.infer<typeof membershipRoleSchema>;
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
