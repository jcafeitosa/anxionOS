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
};
export const governanceErrorDetailsSchema = z.object({
    code: governanceErrorCodeSchema,
    message: z.string().optional(),
});
export type GovernanceErrorCode = (typeof GOVERNANCE_ERROR_CODES)[number];
export function resolveGovernanceErrorStatus(code: GovernanceErrorCode): number {
    return GOVERNANCE_ERROR_STATUS_MAP[code as keyof typeof GOVERNANCE_ERROR_STATUS_MAP];
}

export type GovernanceErrorDetails = z.infer<typeof governanceErrorDetailsSchema>;
