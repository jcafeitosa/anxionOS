import { z } from "zod";
export const principalStatusSchema = z.enum(["active", "suspended"]);
export const principalIdSchema = z.string().uuid();
export const authUserIdSchema = z.string().min(1).max(128);
export const emailAddressSchema = z
    .string()
    .email()
    .max(320)
    .transform((email) => email.toLowerCase());
export const suspensionReasonCodeSchema = z.enum([
    "ops.manual",
    "governance.revoked",
    "security.incident",
    "user.requested",
]);

export type PrincipalStatus = z.infer<typeof principalStatusSchema>;
export type SuspensionReasonCode = z.infer<typeof suspensionReasonCodeSchema>;
