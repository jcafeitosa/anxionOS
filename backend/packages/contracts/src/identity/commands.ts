import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	authUserIdSchema,
	commandIdSchema,
	emailAddressSchema,
	principalIdSchema,
	principalKindSchema,
	principalRevisionSchema,
	revocationReasonCodeSchema,
	serviceCredentialIdSchema,
	serviceCredentialPrefixSchema,
	sessionRefIdSchema,
	suspensionReasonCodeSchema,
} from "./types";

/**
 * Result persisted in `identity_command_journal.response_snapshot` so an
 * idempotent replay returns the original outcome instead of re-executing.
 */
export const identityCommandResultSchema = z.object({
	aggregateId: institutionalUuidSchema,
	revision: principalRevisionSchema,
	status: z.string().min(1),
	idempotentReplay: z.boolean().optional(),
});
export type IdentityCommandResult = z.infer<typeof identityCommandResultSchema>;

/**
 * `commandId` carries the `Idempotency-Key` from the HTTP boundary (R04).
 * Optional so existing in-process callers (Better Auth hooks, workers) keep
 * working: the application layer generates one when absent.
 */
export const registerPrincipalCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	authUserId: authUserIdSchema,
	email: emailAddressSchema,
	/** Defaults to `human`; service principals carry no Better Auth session. */
	kind: principalKindSchema.optional(),
});
export const suspendPrincipalCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	principalId: principalIdSchema,
	reasonCode: suspensionReasonCodeSchema,
	actorPrincipalId: principalIdSchema.optional(),
	expectedRevision: principalRevisionSchema.optional(),
});
export const revokePrincipalCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	principalId: principalIdSchema,
	reasonCode: revocationReasonCodeSchema,
	actorPrincipalId: principalIdSchema.optional(),
	expectedRevision: principalRevisionSchema.optional(),
});
export const reactivatePrincipalCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	principalId: principalIdSchema,
	actorPrincipalId: principalIdSchema.optional(),
	expectedRevision: principalRevisionSchema.optional(),
});
export const syncPrincipalEmailCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	principalId: principalIdSchema,
	email: emailAddressSchema,
});
export const linkAuthUserIdCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	principalId: principalIdSchema,
	authUserId: authUserIdSchema,
});
export const registerServiceIdentityCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	principalId: principalIdSchema,
	label: z.string().min(1).max(128),
});
export const revokeServiceIdentityCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	serviceIdentityId: principalIdSchema,
});
/** R03: SessionRef is a logical reference — never the session token. */
export const recordSessionRevokedCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	principalId: principalIdSchema,
	sessionRefId: sessionRefIdSchema,
	/**
	 * One-way hash of the session owner's opaque reference. Required only when
	 * the reference is not yet recorded in `identity_sessions`.
	 */
	externalRefHash: z.string().min(16).max(128).optional(),
	revokedAt: z.string().datetime().optional(),
	reasonCode: z.string().min(1).max(64).optional(),
});
export const issueServiceCredentialCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	serviceIdentityId: serviceCredentialIdSchema,
	prefix: serviceCredentialPrefixSchema,
	secretHash: z.string().min(1).max(255),
	expiresAt: z.string().datetime().optional(),
});
export const rotateServiceCredentialCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	serviceIdentityId: serviceCredentialIdSchema,
	prefix: serviceCredentialPrefixSchema,
	secretHash: z.string().min(1).max(255),
	expiresAt: z.string().datetime().optional(),
});
export const revokeServiceCredentialCommandSchema = z.object({
	commandId: commandIdSchema.optional(),
	credentialId: serviceCredentialIdSchema,
	reasonCode: z.string().min(1).max(64).optional(),
});

export type RegisterPrincipalCommand = z.infer<
	typeof registerPrincipalCommandSchema
>;
export type SuspendPrincipalCommand = z.infer<
	typeof suspendPrincipalCommandSchema
>;
export type RevokePrincipalCommand = z.infer<
	typeof revokePrincipalCommandSchema
>;
export type ReactivatePrincipalCommand = z.infer<
	typeof reactivatePrincipalCommandSchema
>;
export type SyncPrincipalEmailCommand = z.infer<
	typeof syncPrincipalEmailCommandSchema
>;
export type LinkAuthUserIdCommand = z.infer<typeof linkAuthUserIdCommandSchema>;
export type RegisterServiceIdentityCommand = z.infer<
	typeof registerServiceIdentityCommandSchema
>;
export type RevokeServiceIdentityCommand = z.infer<
	typeof revokeServiceIdentityCommandSchema
>;
export type RecordSessionRevokedCommand = z.infer<
	typeof recordSessionRevokedCommandSchema
>;
export type IssueServiceCredentialCommand = z.infer<
	typeof issueServiceCredentialCommandSchema
>;
export type RotateServiceCredentialCommand = z.infer<
	typeof rotateServiceCredentialCommandSchema
>;
export type RevokeServiceCredentialCommand = z.infer<
	typeof revokeServiceCredentialCommandSchema
>;
