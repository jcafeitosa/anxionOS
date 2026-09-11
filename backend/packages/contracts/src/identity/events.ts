import { z } from "zod";
import {
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

export const IDENTITY_OWNER_DOMAIN = "identity";
export const IDENTITY_EVENT_TYPES = {
	PRINCIPAL_REGISTERED: "identity.principal.registered.v1",
	PRINCIPAL_SUSPENDED: "identity.principal.suspended.v1",
	PRINCIPAL_REACTIVATED: "identity.principal.reactivated.v1",
	PRINCIPAL_EMAIL_UPDATED: "identity.principal.email_updated.v1",
	PRINCIPAL_AUTH_LINKED: "identity.principal.auth_linked.v1",
	PRINCIPAL_REVOKED: "identity.principal.revoked.v1",
	SESSION_REVOKED: "identity.session.revoked.v1",
	SERVICE_IDENTITY_REGISTERED: "identity.service_identity.registered.v1",
	SERVICE_IDENTITY_REVOKED: "identity.service_identity.revoked.v1",
	SERVICE_CREDENTIAL_ISSUED: "identity.service_credential.issued.v1",
	SERVICE_CREDENTIAL_ROTATED: "identity.service_credential.rotated.v1",
	SERVICE_CREDENTIAL_REVOKED: "identity.service_credential.revoked.v1",
} as const;

/**
 * `kind` is optional so envelopes emitted before R03 remain parseable
 * (`graph` treats a missing kind as a human principal). New writes always set it.
 */
export const identityPrincipalRegisteredV1PayloadSchema = z.object({
	principalId: principalIdSchema,
	email: emailAddressSchema,
	kind: principalKindSchema.optional(),
	revision: principalRevisionSchema.optional(),
});
export const identityPrincipalSuspendedV1PayloadSchema = z.object({
	principalId: principalIdSchema,
	reasonCode: suspensionReasonCodeSchema,
	suspendedAt: z.string().datetime(),
	revision: principalRevisionSchema.optional(),
});
export const identityPrincipalRevokedV1PayloadSchema = z.object({
	principalId: principalIdSchema,
	reasonCode: revocationReasonCodeSchema,
	revokedAt: z.string().datetime(),
	revision: principalRevisionSchema.optional(),
});
export const identityPrincipalEmailUpdatedV1PayloadSchema = z.object({
	principalId: principalIdSchema,
	email: emailAddressSchema,
});
export const identityPrincipalAuthLinkedV1PayloadSchema = z.object({
	principalId: principalIdSchema,
});
export const identityPrincipalReactivatedV1PayloadSchema = z.object({
	principalId: principalIdSchema,
	reactivatedAt: z.string().datetime(),
	actorPrincipalId: principalIdSchema.optional(),
	revision: principalRevisionSchema.optional(),
});
/**
 * R03 INV-IDN-03: `sessionRefId` is a logical reference to a Better Auth
 * session — never the session token, cookie or any credential material.
 */
export const identitySessionRevokedV1PayloadSchema = z.object({
	sessionRefId: sessionRefIdSchema,
	principalId: principalIdSchema,
	revokedAt: z.string().datetime(),
	reasonCode: z.string().min(1).max(64).optional(),
});
export const identityServiceIdentityRegisteredV1PayloadSchema = z.object({
	serviceIdentityId: principalIdSchema,
	principalId: principalIdSchema,
	label: z.string().min(1).max(128),
});
export const identityServiceIdentityRevokedV1PayloadSchema = z.object({
	serviceIdentityId: principalIdSchema,
	principalId: principalIdSchema,
	revokedAt: z.string().datetime(),
});
/** Secret material never appears here — only the public prefix and the hash ref. */
export const identityServiceCredentialIssuedV1PayloadSchema = z.object({
	credentialId: serviceCredentialIdSchema,
	serviceIdentityId: serviceCredentialIdSchema,
	principalId: principalIdSchema,
	prefix: serviceCredentialPrefixSchema,
	issuedAt: z.string().datetime(),
});
export const identityServiceCredentialRotatedV1PayloadSchema = z.object({
	credentialId: serviceCredentialIdSchema,
	previousCredentialId: serviceCredentialIdSchema,
	serviceIdentityId: serviceCredentialIdSchema,
	prefix: serviceCredentialPrefixSchema,
	rotatedAt: z.string().datetime(),
});
export const identityServiceCredentialRevokedV1PayloadSchema = z.object({
	credentialId: serviceCredentialIdSchema,
	serviceIdentityId: serviceCredentialIdSchema,
	revokedAt: z.string().datetime(),
});
export const identityEventPayloadSchemas = {
	[IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED]:
		identityPrincipalRegisteredV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED]:
		identityPrincipalSuspendedV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.PRINCIPAL_REVOKED]:
		identityPrincipalRevokedV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.PRINCIPAL_EMAIL_UPDATED]:
		identityPrincipalEmailUpdatedV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.PRINCIPAL_AUTH_LINKED]:
		identityPrincipalAuthLinkedV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.PRINCIPAL_REACTIVATED]:
		identityPrincipalReactivatedV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.SESSION_REVOKED]: identitySessionRevokedV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REGISTERED]:
		identityServiceIdentityRegisteredV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REVOKED]:
		identityServiceIdentityRevokedV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_ISSUED]:
		identityServiceCredentialIssuedV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_ROTATED]:
		identityServiceCredentialRotatedV1PayloadSchema,
	[IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_REVOKED]:
		identityServiceCredentialRevokedV1PayloadSchema,
};
export const identityEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED),
		payload: identityPrincipalRegisteredV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED),
		payload: identityPrincipalSuspendedV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.PRINCIPAL_REVOKED),
		payload: identityPrincipalRevokedV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.PRINCIPAL_EMAIL_UPDATED),
		payload: identityPrincipalEmailUpdatedV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.PRINCIPAL_AUTH_LINKED),
		payload: identityPrincipalAuthLinkedV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.PRINCIPAL_REACTIVATED),
		payload: identityPrincipalReactivatedV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.SESSION_REVOKED),
		payload: identitySessionRevokedV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REGISTERED),
		payload: identityServiceIdentityRegisteredV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REVOKED),
		payload: identityServiceIdentityRevokedV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_ISSUED),
		payload: identityServiceCredentialIssuedV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_ROTATED),
		payload: identityServiceCredentialRotatedV1PayloadSchema,
	}),
	z.object({
		eventType: z.literal(IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_REVOKED),
		payload: identityServiceCredentialRevokedV1PayloadSchema,
	}),
]);

export type IdentityEventType =
	(typeof IDENTITY_EVENT_TYPES)[keyof typeof IDENTITY_EVENT_TYPES];

export type IdentityPrincipalRegisteredV1Payload = z.infer<
	typeof identityPrincipalRegisteredV1PayloadSchema
>;
export type IdentityPrincipalSuspendedV1Payload = z.infer<
	typeof identityPrincipalSuspendedV1PayloadSchema
>;
export type IdentityPrincipalRevokedV1Payload = z.infer<
	typeof identityPrincipalRevokedV1PayloadSchema
>;
export type IdentityPrincipalEmailUpdatedV1Payload = z.infer<
	typeof identityPrincipalEmailUpdatedV1PayloadSchema
>;
export type IdentityPrincipalAuthLinkedV1Payload = z.infer<
	typeof identityPrincipalAuthLinkedV1PayloadSchema
>;
export type IdentityPrincipalReactivatedV1Payload = z.infer<
	typeof identityPrincipalReactivatedV1PayloadSchema
>;
export type IdentitySessionRevokedV1Payload = z.infer<
	typeof identitySessionRevokedV1PayloadSchema
>;
export type IdentityServiceIdentityRegisteredV1Payload = z.infer<
	typeof identityServiceIdentityRegisteredV1PayloadSchema
>;
export type IdentityServiceIdentityRevokedV1Payload = z.infer<
	typeof identityServiceIdentityRevokedV1PayloadSchema
>;
export type IdentityServiceCredentialIssuedV1Payload = z.infer<
	typeof identityServiceCredentialIssuedV1PayloadSchema
>;
export type IdentityServiceCredentialRotatedV1Payload = z.infer<
	typeof identityServiceCredentialRotatedV1PayloadSchema
>;
export type IdentityServiceCredentialRevokedV1Payload = z.infer<
	typeof identityServiceCredentialRevokedV1PayloadSchema
>;
