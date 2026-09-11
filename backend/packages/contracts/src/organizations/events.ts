import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	agencyStatusSchema,
	marketScopeSchema,
	membershipRoleSchema,
	onboardingStepSchema,
} from "./types";
export const ORGANIZATIONS_OWNER_DOMAIN = "organizations";
export const ORGANIZATION_EVENT_TYPES = {
	AGENCY_CREATED: "organizations.agency.created.v1",
	AGENCY_MARKETS_UPDATED: "organizations.agency.markets_updated.v1",
	AGENCY_STATUS_CHANGED: "organizations.agency.status_changed.v1",
	MEMBERSHIP_INVITED: "organizations.membership.invited.v1",
	MEMBERSHIP_ACTIVATED: "organizations.membership.activated.v1",
	MEMBERSHIP_REVOKED: "organizations.membership.revoked.v1",
	OWNERSHIP_TRANSFERRED: "organizations.agency.ownership_transferred.v1",
};
export const agencyCreatedPayloadSchema = z.object({
	agencyId: institutionalUuidSchema,
	ownerPrincipalId: institutionalUuidSchema,
	displayName: z.string().min(1).max(200),
	marketScope: marketScopeSchema,
	status: agencyStatusSchema,
	onboardingStep: onboardingStepSchema,
	revision: z.number().int().nonnegative(),
});
export const agencyMarketsUpdatedPayloadSchema = z.object({
	agencyId: institutionalUuidSchema,
	marketScope: marketScopeSchema,
	previousMarketScope: marketScopeSchema,
	revision: z.number().int().nonnegative(),
});
export const agencyStatusChangedPayloadSchema = z.object({
	agencyId: institutionalUuidSchema,
	status: agencyStatusSchema,
	onboardingStep: onboardingStepSchema,
	previousStatus: agencyStatusSchema,
	revision: z.number().int().nonnegative(),
});
export const membershipInvitedPayloadSchema = z.object({
	membershipId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	email: z.string().email(),
	role: membershipRoleSchema,
	revision: z.number().int().nonnegative(),
});
export const membershipActivatedPayloadSchema = z.object({
	membershipId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	principalId: institutionalUuidSchema,
	role: membershipRoleSchema,
	revision: z.number().int().nonnegative(),
});
export const membershipRevokedPayloadSchema = z.object({
	membershipId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	principalId: institutionalUuidSchema,
	revision: z.number().int().nonnegative(),
});
export const ownershipTransferredPayloadSchema = z.object({
	agencyId: institutionalUuidSchema,
	previousOwnerPrincipalId: institutionalUuidSchema,
	previousOwnerMembershipId: institutionalUuidSchema,
	newOwnerPrincipalId: institutionalUuidSchema,
	newOwnerMembershipId: institutionalUuidSchema,
	revision: z.number().int().nonnegative(),
});
export const organizationEventPayloadSchema = z.discriminatedUnion(
	"eventType",
	[
		z.object({
			eventType: z.literal(ORGANIZATION_EVENT_TYPES.AGENCY_CREATED),
			payload: agencyCreatedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORGANIZATION_EVENT_TYPES.AGENCY_MARKETS_UPDATED),
			payload: agencyMarketsUpdatedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORGANIZATION_EVENT_TYPES.AGENCY_STATUS_CHANGED),
			payload: agencyStatusChangedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORGANIZATION_EVENT_TYPES.MEMBERSHIP_INVITED),
			payload: membershipInvitedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED),
			payload: membershipActivatedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORGANIZATION_EVENT_TYPES.MEMBERSHIP_REVOKED),
			payload: membershipRevokedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORGANIZATION_EVENT_TYPES.OWNERSHIP_TRANSFERRED),
			payload: ownershipTransferredPayloadSchema,
		}),
	],
);

export type OrganizationEventType =
	(typeof ORGANIZATION_EVENT_TYPES)[keyof typeof ORGANIZATION_EVENT_TYPES];

export type AgencyCreatedPayload = z.infer<typeof agencyCreatedPayloadSchema>;
export type AgencyMarketsUpdatedPayload = z.infer<
	typeof agencyMarketsUpdatedPayloadSchema
>;
export type AgencyStatusChangedPayload = z.infer<
	typeof agencyStatusChangedPayloadSchema
>;
export type MembershipInvitedPayload = z.infer<
	typeof membershipInvitedPayloadSchema
>;
export type MembershipActivatedPayload = z.infer<
	typeof membershipActivatedPayloadSchema
>;
export type MembershipRevokedPayload = z.infer<
	typeof membershipRevokedPayloadSchema
>;
export type OwnershipTransferredPayload = z.infer<
	typeof ownershipTransferredPayloadSchema
>;
