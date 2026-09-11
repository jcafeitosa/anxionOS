import { z } from "zod";
export const GOVERNANCE_ERROR_CODES = [
	"GOV_PRINCIPAL_NOT_FOUND",
	"GOV_GRANT_NOT_FOUND",
	"GOV_GRANT_REVOKED",
	"GOV_INSUFFICIENT_AUTHORITY",
	"GOV_DELEGATION_EXCEEDS_PARENT",
	"GOV_CHANGE_PROPOSAL_NOT_FOUND",
	"GOV_PROPOSAL_NOT_PENDING",
	"GOV_EPOCH_STALE",
	"GOV_AUTONOMY_LEVEL_DISABLED",
	"GOV_AUTONOMY_TRANSITION_DENIED",
	"GOV_AUTONOMY_CAPABILITY_DENIED",
	"GOV_AUTONOMY_ASSIGNMENT_EXISTS",
	"GOV_AUTONOMY_ASSIGNMENT_NOT_FOUND",
	// ANX-462: capability de plataforma emitida em escopo de agencia (ou o inverso).
	"GOV_CAPABILITY_SCOPE_MISMATCH",
	// ANX-466: capability fora do catalogo declarado de grants (string livre).
	"GOV_CAPABILITY_UNKNOWN",
] as const;
export const governanceErrorCodeSchema = z.enum(GOVERNANCE_ERROR_CODES);
export const GOVERNANCE_ERROR_STATUS_MAP = {
	GOV_PRINCIPAL_NOT_FOUND: 404,
	GOV_GRANT_NOT_FOUND: 404,
	GOV_GRANT_REVOKED: 409,
	GOV_INSUFFICIENT_AUTHORITY: 403,
	GOV_DELEGATION_EXCEEDS_PARENT: 409,
	GOV_CHANGE_PROPOSAL_NOT_FOUND: 404,
	GOV_PROPOSAL_NOT_PENDING: 409,
	GOV_EPOCH_STALE: 409,
	GOV_AUTONOMY_LEVEL_DISABLED: 403,
	GOV_AUTONOMY_TRANSITION_DENIED: 409,
	GOV_AUTONOMY_CAPABILITY_DENIED: 403,
	GOV_AUTONOMY_ASSIGNMENT_EXISTS: 409,
	GOV_AUTONOMY_ASSIGNMENT_NOT_FOUND: 404,
	GOV_CAPABILITY_SCOPE_MISMATCH: 409,
	GOV_CAPABILITY_UNKNOWN: 400,
};
export const governanceErrorDetailsSchema = z.object({
	code: governanceErrorCodeSchema,
	message: z.string().optional(),
});
export type GovernanceErrorCode = (typeof GOVERNANCE_ERROR_CODES)[number];
export function resolveGovernanceErrorStatus(
	code: GovernanceErrorCode,
): number {
	return GOVERNANCE_ERROR_STATUS_MAP[
		code as keyof typeof GOVERNANCE_ERROR_STATUS_MAP
	];
}

export type GovernanceErrorDetails = z.infer<
	typeof governanceErrorDetailsSchema
>;
