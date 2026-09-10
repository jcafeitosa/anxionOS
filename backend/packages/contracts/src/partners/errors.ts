import { z } from "zod";
export const PARTNERS_ERROR_CODES = {
	DUPLICATE_IDEMPOTENCY: "PTR_DUPLICATE_IDEMPOTENCY",
	CROSS_TENANT: "PTR_CROSS_TENANT",
	GRANT_INVALID: "PTR_GRANT_INVALID",
	PARTNER_NOT_FOUND: "PTR_PARTNER_NOT_FOUND",
	REFERRAL_CONFLICT: "PTR_REFERRAL_CONFLICT",
};
export const partnersErrorCodeSchema = z.enum(
	Object.values(PARTNERS_ERROR_CODES) as [string, ...string[]],
);
export const PARTNERS_ERROR_STATUS_MAP = {
	PTR_DUPLICATE_IDEMPOTENCY: 409,
	PTR_CROSS_TENANT: 403,
	PTR_GRANT_INVALID: 403,
	PTR_PARTNER_NOT_FOUND: 404,
	PTR_REFERRAL_CONFLICT: 409,
};
export type PartnersErrorCode =
	(typeof PARTNERS_ERROR_CODES)[keyof typeof PARTNERS_ERROR_CODES];
export function resolvePartnersErrorStatus(code: PartnersErrorCode): number {
	return PARTNERS_ERROR_STATUS_MAP[
		code as keyof typeof PARTNERS_ERROR_STATUS_MAP
	];
}
