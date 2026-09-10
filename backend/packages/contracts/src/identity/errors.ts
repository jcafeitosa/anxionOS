import { z } from "zod";
export const IDENTITY_ERROR_CODES = [
	"PRINCIPAL_NOT_FOUND",
	"PRINCIPAL_EMAIL_TAKEN",
	"PRINCIPAL_ALREADY_SUSPENDED",
	"PRINCIPAL_NOT_SUSPENDED",
	"PRINCIPAL_AUTH_USER_TAKEN",
	"SERVICE_IDENTITY_NOT_FOUND",
	"SERVICE_IDENTITY_ALREADY_REVOKED",
	"IDN_IDENTITY_UNAVAILABLE",
] as const;
export const identityErrorCodeSchema = z.enum(IDENTITY_ERROR_CODES);
export const IDENTITY_ERROR_STATUS_MAP = {
	PRINCIPAL_NOT_FOUND: 404,
	PRINCIPAL_EMAIL_TAKEN: 409,
	PRINCIPAL_ALREADY_SUSPENDED: 409,
	PRINCIPAL_NOT_SUSPENDED: 409,
	PRINCIPAL_AUTH_USER_TAKEN: 409,
	SERVICE_IDENTITY_NOT_FOUND: 404,
	SERVICE_IDENTITY_ALREADY_REVOKED: 409,
	IDN_IDENTITY_UNAVAILABLE: 503,
};
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
