import { z } from "zod";
import { emailAddressSchema, principalIdSchema, suspensionReasonCodeSchema, } from "./types";
export const IDENTITY_OWNER_DOMAIN = "identity";
export const IDENTITY_EVENT_TYPES = {
    PRINCIPAL_REGISTERED: "identity.principal.registered.v1",
    PRINCIPAL_SUSPENDED: "identity.principal.suspended.v1",
    PRINCIPAL_REACTIVATED: "identity.principal.reactivated.v1",
    PRINCIPAL_EMAIL_UPDATED: "identity.principal.email_updated.v1",
    PRINCIPAL_AUTH_LINKED: "identity.principal.auth_linked.v1",
    SERVICE_IDENTITY_REGISTERED: "identity.service_identity.registered.v1",
    SERVICE_IDENTITY_REVOKED: "identity.service_identity.revoked.v1",
};
export const identityPrincipalRegisteredV1PayloadSchema = z.object({
    principalId: principalIdSchema,
    email: emailAddressSchema,
});
export const identityPrincipalSuspendedV1PayloadSchema = z.object({
    principalId: principalIdSchema,
    reasonCode: suspensionReasonCodeSchema,
    suspendedAt: z.string().datetime(),
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
export const identityEventPayloadSchemas = {
    [IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED]: identityPrincipalRegisteredV1PayloadSchema,
    [IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED]: identityPrincipalSuspendedV1PayloadSchema,
    [IDENTITY_EVENT_TYPES.PRINCIPAL_EMAIL_UPDATED]: identityPrincipalEmailUpdatedV1PayloadSchema,
    [IDENTITY_EVENT_TYPES.PRINCIPAL_AUTH_LINKED]: identityPrincipalAuthLinkedV1PayloadSchema,
    [IDENTITY_EVENT_TYPES.PRINCIPAL_REACTIVATED]: identityPrincipalReactivatedV1PayloadSchema,
    [IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REGISTERED]: identityServiceIdentityRegisteredV1PayloadSchema,
    [IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REVOKED]: identityServiceIdentityRevokedV1PayloadSchema,
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
        eventType: z.literal(IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REGISTERED),
        payload: identityServiceIdentityRegisteredV1PayloadSchema,
    }),
    z.object({
        eventType: z.literal(IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REVOKED),
        payload: identityServiceIdentityRevokedV1PayloadSchema,
    }),
]);

export type IdentityEventType = (typeof IDENTITY_EVENT_TYPES)[keyof typeof IDENTITY_EVENT_TYPES];

export type IdentityPrincipalRegisteredV1Payload = z.infer<typeof identityPrincipalRegisteredV1PayloadSchema>;
export type IdentityPrincipalSuspendedV1Payload = z.infer<typeof identityPrincipalSuspendedV1PayloadSchema>;
export type IdentityPrincipalEmailUpdatedV1Payload = z.infer<typeof identityPrincipalEmailUpdatedV1PayloadSchema>;
export type IdentityPrincipalAuthLinkedV1Payload = z.infer<typeof identityPrincipalAuthLinkedV1PayloadSchema>;
export type IdentityPrincipalReactivatedV1Payload = z.infer<typeof identityPrincipalReactivatedV1PayloadSchema>;
export type IdentityServiceIdentityRegisteredV1Payload = z.infer<typeof identityServiceIdentityRegisteredV1PayloadSchema>;
export type IdentityServiceIdentityRevokedV1Payload = z.infer<typeof identityServiceIdentityRevokedV1PayloadSchema>;
