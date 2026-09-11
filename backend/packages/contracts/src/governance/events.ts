import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import { autonomyLevelSchema } from "./autonomy-policy";
import {
	approvalDecisionSchema,
	changeProposalKindSchema,
	grantStatusSchema,
	mandateKindSchema,
} from "./types";
export const GOVERNANCE_OWNER_DOMAIN = "governance";
export const GOVERNANCE_EVENT_TYPES = {
	GRANT_ISSUED: "governance.grant.issued.v1",
	GRANT_REVOKED: "governance.grant.revoked.v1",
	DELEGATION_CREATED: "governance.delegation.created.v1",
	MANDATE_ISSUED: "governance.mandate.issued.v1",
	CHANGE_PROPOSAL_SUBMITTED: "governance.change_proposal.submitted.v1",
	APPROVAL_RESOLVED: "governance.approval.resolved.v1",
	AUTHORITY_EPOCH_BUMPED: "governance.authority_epoch.bumped.v1",
	BREAK_GLASS_ACTIVATED: "governance.break_glass.activated.v1",
	AUTONOMY_ASSIGNED: "governance.autonomy.assigned.v1",
	AUTONOMY_TRANSITIONED: "governance.autonomy.transitioned.v1",
};
export const grantIssuedPayloadSchema = z.object({
	grantId: institutionalUuidSchema,
	scopeId: institutionalUuidSchema,
	granteePrincipalId: institutionalUuidSchema,
	capability: z.string().min(1),
	status: grantStatusSchema,
	authorityEpoch: z.number().int().nonnegative(),
	revision: z.number().int().nonnegative(),
	validFrom: z.string().datetime().optional(),
	validUntil: z.string().datetime().nullable().optional(),
	recordedFrom: z.string().datetime().optional(),
	recordedUntil: z.string().datetime().nullable().optional(),
});
export const grantRevokedPayloadSchema = z.object({
	grantId: institutionalUuidSchema,
	scopeId: institutionalUuidSchema,
	authorityEpoch: z.number().int().nonnegative(),
	revision: z.number().int().nonnegative(),
	revokedAt: z.string().datetime().optional(),
});
export const changeProposalSubmittedPayloadSchema = z.object({
	proposalId: institutionalUuidSchema,
	scopeId: institutionalUuidSchema,
	kind: changeProposalKindSchema,
	payloadHash: z.string().min(1),
	revision: z.number().int().nonnegative(),
});
export const approvalResolvedPayloadSchema = z.object({
	approvalId: institutionalUuidSchema,
	changeProposalId: institutionalUuidSchema,
	decision: approvalDecisionSchema,
	resolverPrincipalId: institutionalUuidSchema,
	revision: z.number().int().nonnegative(),
});
export const authorityEpochBumpedPayloadSchema = z.object({
	scopeId: institutionalUuidSchema,
	epoch: z.number().int().nonnegative(),
	reason: z.string().min(1),
});
export const delegationCreatedPayloadSchema = z.object({
	delegationId: institutionalUuidSchema,
	parentGrantId: institutionalUuidSchema,
	delegatePrincipalId: institutionalUuidSchema,
	capabilitySubset: z.array(z.string().min(1)),
	childGrantIds: z.array(institutionalUuidSchema),
	revision: z.number().int().nonnegative(),
});
export const breakGlassActivatedPayloadSchema = z.object({
	grantId: institutionalUuidSchema,
	scopeId: institutionalUuidSchema,
	granteePrincipalId: institutionalUuidSchema,
	capability: z.string().min(1),
	reason: z.string().min(1),
	expiresAt: z.string().datetime(),
	incidentRef: z.string().min(1).optional(),
	revision: z.number().int().nonnegative(),
});
export const mandateIssuedPayloadSchema = z.object({
	mandateId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	mandateKind: mandateKindSchema,
	grantId: institutionalUuidSchema,
	revision: z.number().int().nonnegative(),
});
export const autonomyAssignedPayloadSchema = z.object({
	assignmentId: institutionalUuidSchema,
	scopeId: institutionalUuidSchema,
	subjectAgentId: institutionalUuidSchema,
	level: autonomyLevelSchema,
	authorityEpoch: z.number().int().nonnegative(),
	revision: z.number().int().nonnegative(),
});
export const autonomyTransitionedPayloadSchema = z.object({
	assignmentId: institutionalUuidSchema,
	scopeId: institutionalUuidSchema,
	subjectAgentId: institutionalUuidSchema,
	fromLevel: autonomyLevelSchema.nullable(),
	toLevel: autonomyLevelSchema,
	transitionKind: z.enum(["promote", "demote", "takeover"]),
	actorPrincipalId: institutionalUuidSchema,
	reason: z.string().max(500).optional(),
	authorityEpoch: z.number().int().nonnegative(),
	revision: z.number().int().nonnegative(),
});
export const governanceEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(GOVERNANCE_EVENT_TYPES.GRANT_ISSUED),
		payload: grantIssuedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(GOVERNANCE_EVENT_TYPES.GRANT_REVOKED),
		payload: grantRevokedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(GOVERNANCE_EVENT_TYPES.DELEGATION_CREATED),
		payload: delegationCreatedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(GOVERNANCE_EVENT_TYPES.CHANGE_PROPOSAL_SUBMITTED),
		payload: changeProposalSubmittedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(GOVERNANCE_EVENT_TYPES.APPROVAL_RESOLVED),
		payload: approvalResolvedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(GOVERNANCE_EVENT_TYPES.AUTHORITY_EPOCH_BUMPED),
		payload: authorityEpochBumpedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(GOVERNANCE_EVENT_TYPES.MANDATE_ISSUED),
		payload: mandateIssuedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(GOVERNANCE_EVENT_TYPES.BREAK_GLASS_ACTIVATED),
		payload: breakGlassActivatedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(GOVERNANCE_EVENT_TYPES.AUTONOMY_ASSIGNED),
		payload: autonomyAssignedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(GOVERNANCE_EVENT_TYPES.AUTONOMY_TRANSITIONED),
		payload: autonomyTransitionedPayloadSchema,
	}),
]);

export type GovernanceEventType =
	(typeof GOVERNANCE_EVENT_TYPES)[keyof typeof GOVERNANCE_EVENT_TYPES];

export type GrantIssuedPayload = z.infer<typeof grantIssuedPayloadSchema>;
export type GrantRevokedPayload = z.infer<typeof grantRevokedPayloadSchema>;
export type ChangeProposalSubmittedPayload = z.infer<
	typeof changeProposalSubmittedPayloadSchema
>;
export type ApprovalResolvedPayload = z.infer<
	typeof approvalResolvedPayloadSchema
>;
export type AuthorityEpochBumpedPayload = z.infer<
	typeof authorityEpochBumpedPayloadSchema
>;
export type DelegationCreatedPayload = z.infer<
	typeof delegationCreatedPayloadSchema
>;
export type BreakGlassActivatedPayload = z.infer<
	typeof breakGlassActivatedPayloadSchema
>;
export type MandateIssuedPayload = z.infer<typeof mandateIssuedPayloadSchema>;
export type AutonomyAssignedPayload = z.infer<
	typeof autonomyAssignedPayloadSchema
>;
export type AutonomyTransitionedPayload = z.infer<
	typeof autonomyTransitionedPayloadSchema
>;
