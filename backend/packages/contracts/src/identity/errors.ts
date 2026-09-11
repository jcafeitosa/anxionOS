import { z } from "zod";

/**
 * R04: canonical identity error codes (`IDN_*`). Replaces the ad-hoc
 * `PRINCIPAL_*` / `SERVICE_IDENTITY_*` set from the P0/P1 slices, which had no
 * consumer outside this package (verified by grep across `backend/`).
 */
export const IDENTITY_ERROR_CODES = [
	"IDN_PRINCIPAL_NOT_FOUND",
	"IDN_PRINCIPAL_EMAIL_TAKEN",
	"IDN_PRINCIPAL_AUTH_USER_TAKEN",
	"IDN_PRINCIPAL_NOT_SUSPENDED",
	"IDN_PRINCIPAL_REVOKED",
	"IDN_REVISION_CONFLICT",
	"IDN_DUPLICATE_IDEMPOTENCY",
	"IDN_IDEMPOTENT_REPLAY",
	"IDN_CROSS_TENANT",
	"IDN_FORBIDDEN",
	"IDN_SESSION_NOT_FOUND",
	"IDN_SESSION_REVOKED",
	"IDN_SERVICE_IDENTITY_NOT_FOUND",
	"IDN_SERVICE_IDENTITY_ALREADY_REVOKED",
	"IDN_CREDENTIAL_NOT_FOUND",
	"IDN_CREDENTIAL_PREFIX_TAKEN",
	"IDN_IDENTITY_UNAVAILABLE",
] as const;
export const identityErrorCodeSchema = z.enum(IDENTITY_ERROR_CODES);
export const IDENTITY_ERROR_STATUS_MAP = {
	IDN_PRINCIPAL_NOT_FOUND: 404,
	IDN_PRINCIPAL_EMAIL_TAKEN: 409,
	IDN_PRINCIPAL_AUTH_USER_TAKEN: 409,
	IDN_PRINCIPAL_NOT_SUSPENDED: 409,
	IDN_PRINCIPAL_REVOKED: 409,
	IDN_REVISION_CONFLICT: 409,
	IDN_DUPLICATE_IDEMPOTENCY: 409,
	IDN_IDEMPOTENT_REPLAY: 200,
	IDN_CROSS_TENANT: 403,
	IDN_FORBIDDEN: 403,
	IDN_SESSION_NOT_FOUND: 404,
	IDN_SESSION_REVOKED: 401,
	IDN_SERVICE_IDENTITY_NOT_FOUND: 404,
	IDN_SERVICE_IDENTITY_ALREADY_REVOKED: 409,
	IDN_CREDENTIAL_NOT_FOUND: 404,
	IDN_CREDENTIAL_PREFIX_TAKEN: 409,
	IDN_IDENTITY_UNAVAILABLE: 503,
} as const;
export const identityErrorDetailsSchema = z.object({
	code: identityErrorCodeSchema,
	message: z.string().optional(),
});
export type IdentityErrorCode = (typeof IDENTITY_ERROR_CODES)[number];
export function resolveIdentityErrorStatus(code: IdentityErrorCode): number {
	return IDENTITY_ERROR_STATUS_MAP[
		code as keyof typeof IDENTITY_ERROR_STATUS_MAP
	];
}

export type IdentityErrorDetails = z.infer<typeof identityErrorDetailsSchema>;
