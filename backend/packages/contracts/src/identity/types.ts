import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";

/**
 * R03 (identity domain sketch): ACTIVE | SUSPENDED | REVOKED.
 * REVOKED is terminal — a revoked principal cannot be reactivated.
 */
export const principalStatusSchema = z.enum(["active", "suspended", "revoked"]);
/**
 * `kind` is immutable after insert (R03). Human principals are provisioned by
 * Better Auth signup; service principals authenticate with credentials owned by
 * this module and never hold a human session.
 */
export const principalKindSchema = z.enum(["human", "service"]);
export const principalIdSchema = institutionalUuidSchema;
/** Optimistic concurrency token (R03: `revision`). Starts at 1. */
export const principalRevisionSchema = z.number().int().nonnegative();
/** Idempotency key materialized as the command id in `identity_command_journal`. */
export const commandIdSchema = institutionalUuidSchema;
export const sessionRefIdSchema = institutionalUuidSchema;
export const serviceCredentialIdSchema = institutionalUuidSchema;
/**
 * Public, non-secret handle for a service credential (prefix of the API key).
 * The secret itself is never persisted — only its hash (R03: ServiceCredentialRef).
 */
export const serviceCredentialPrefixSchema = z
	.string()
	.min(8)
	.max(32)
	.regex(/^[a-z0-9_]+$/, "Invalid credential prefix");
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
export const revocationReasonCodeSchema = z.enum([
	"ops.manual",
	"governance.revoked",
	"security.incident",
	"user.requested",
	"gdpr.erasure",
]);

export type PrincipalStatus = z.infer<typeof principalStatusSchema>;
export type PrincipalKind = z.infer<typeof principalKindSchema>;
export type SuspensionReasonCode = z.infer<typeof suspensionReasonCodeSchema>;
export type RevocationReasonCode = z.infer<typeof revocationReasonCodeSchema>;
