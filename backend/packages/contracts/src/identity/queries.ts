import { z } from "zod";
import {
	emailAddressSchema,
	principalIdSchema,
	principalKindSchema,
	principalRevisionSchema,
	principalStatusSchema,
	revocationReasonCodeSchema,
	serviceCredentialIdSchema,
	serviceCredentialPrefixSchema,
	sessionRefIdSchema,
	suspensionReasonCodeSchema,
} from "./types";

/**
 * Public principal DTO — never carries `authUserId` or any secret.
 * `authUserId` is a Better Auth boundary detail (D-IDN-003).
 */
export const principalDtoSchema = z.object({
	id: principalIdSchema,
	email: emailAddressSchema,
	kind: principalKindSchema,
	status: principalStatusSchema,
	revision: principalRevisionSchema,
	createdAt: z.string().datetime(),
	suspendedAt: z.string().datetime().optional(),
	suspensionReason: suspensionReasonCodeSchema.optional(),
	revokedAt: z.string().datetime().optional(),
	revocationReason: revocationReasonCodeSchema.optional(),
});

/**
 * Session reference DTO (R03: SessionRef is a logical id, not the token).
 * `sessionRefId` is an opaque hash issued by the session owner.
 */
export const sessionRefDtoSchema = z.object({
	sessionRefId: sessionRefIdSchema,
	principalId: principalIdSchema,
	status: z.enum(["active", "revoked"]),
	createdAt: z.string().datetime(),
	revokedAt: z.string().datetime().optional(),
	revocationReason: z.string().max(64).optional(),
});

/**
 * Service credential DTO — hash and secret are never exposed, only the public
 * prefix so an operator can identify which key to rotate.
 */
export const serviceCredentialDtoSchema = z.object({
	credentialId: serviceCredentialIdSchema,
	serviceIdentityId: serviceCredentialIdSchema,
	prefix: serviceCredentialPrefixSchema,
	status: z.enum(["active", "rotated", "revoked", "expired"]),
	issuedAt: z.string().datetime(),
	expiresAt: z.string().datetime().optional(),
	rotatedAt: z.string().datetime().optional(),
	revokedAt: z.string().datetime().optional(),
});

export type PrincipalDto = z.infer<typeof principalDtoSchema>;
export type SessionRefDto = z.infer<typeof sessionRefDtoSchema>;
export type ServiceCredentialDto = z.infer<typeof serviceCredentialDtoSchema>;
