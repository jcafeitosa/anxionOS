import { z } from "zod";
import { authUserIdSchema, emailAddressSchema, principalIdSchema, suspensionReasonCodeSchema, } from "./types";
export const registerPrincipalCommandSchema = z.object({
    authUserId: authUserIdSchema,
    email: emailAddressSchema,
});
export const suspendPrincipalCommandSchema = z.object({
    principalId: principalIdSchema,
    reasonCode: suspensionReasonCodeSchema,
    actorPrincipalId: principalIdSchema.optional(),
});
export const reactivatePrincipalCommandSchema = z.object({
    principalId: principalIdSchema,
    actorPrincipalId: principalIdSchema.optional(),
});
export const syncPrincipalEmailCommandSchema = z.object({
    principalId: principalIdSchema,
    email: emailAddressSchema,
});
export const linkAuthUserIdCommandSchema = z.object({
    principalId: principalIdSchema,
    authUserId: authUserIdSchema,
});
export const registerServiceIdentityCommandSchema = z.object({
    principalId: principalIdSchema,
    label: z.string().min(1).max(128),
});
export const revokeServiceIdentityCommandSchema = z.object({
    serviceIdentityId: principalIdSchema,
});

export type RegisterPrincipalCommand = z.infer<typeof registerPrincipalCommandSchema>;
export type SuspendPrincipalCommand = z.infer<typeof suspendPrincipalCommandSchema>;
export type ReactivatePrincipalCommand = z.infer<typeof reactivatePrincipalCommandSchema>;
export type SyncPrincipalEmailCommand = z.infer<typeof syncPrincipalEmailCommandSchema>;
export type LinkAuthUserIdCommand = z.infer<typeof linkAuthUserIdCommandSchema>;
export type RegisterServiceIdentityCommand = z.infer<typeof registerServiceIdentityCommandSchema>;
export type RevokeServiceIdentityCommand = z.infer<typeof revokeServiceIdentityCommandSchema>;
