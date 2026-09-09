import { z } from "zod";
export const ORGANIZATION_ERROR_CODES = [
    "ORG_PRINCIPAL_NOT_FOUND",
    "ORG_AGENCY_NOT_FOUND",
    "ORG_MEMBERSHIP_EXISTS",
    "ORG_MEMBERSHIP_NOT_INVITED",
    "ORG_OWNER_REQUIRED",
    "ORG_INVALID_STATUS_TRANSITION",
    "ORG_CROSS_TENANT",
    "ORG_IDENTITY_UNAVAILABLE",
    "ORG_INVITE_EXPIRED",
    "ORG_INVITE_EMAIL_MISMATCH",
] as const;
export const organizationErrorCodeSchema = z.enum(ORGANIZATION_ERROR_CODES);
export const ORGANIZATION_ERROR_STATUS_MAP = {
    ORG_PRINCIPAL_NOT_FOUND: 404,
    ORG_AGENCY_NOT_FOUND: 404,
    ORG_MEMBERSHIP_EXISTS: 409,
    ORG_MEMBERSHIP_NOT_INVITED: 409,
    ORG_OWNER_REQUIRED: 409,
    ORG_INVALID_STATUS_TRANSITION: 409,
    ORG_CROSS_TENANT: 403,
    ORG_IDENTITY_UNAVAILABLE: 503,
    ORG_INVITE_EXPIRED: 410,
    ORG_INVITE_EMAIL_MISMATCH: 403,
};
export const organizationErrorDetailsSchema = z.object({
    code: organizationErrorCodeSchema,
    message: z.string().optional(),
});
export type OrganizationsErrorCode = (typeof ORGANIZATION_ERROR_CODES)[number];
export function resolveOrganizationErrorStatus(code: OrganizationErrorCode): number {
    return ORGANIZATION_ERROR_STATUS_MAP[code as keyof typeof ORGANIZATION_ERROR_STATUS_MAP];
}

export type OrganizationErrorCode = (typeof ORGANIZATION_ERROR_CODES)[number];

export type OrganizationErrorDetails = z.infer<typeof organizationErrorDetailsSchema>;
