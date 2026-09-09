import { z } from "zod";
import { approvalDecisionSchema, changeProposalKindSchema, grantStatusSchema, mandateKindSchema, } from "./types";
export const GOVERNANCE_OWNER_DOMAIN = "governance";
export const GOVERNANCE_EVENT_TYPES = {
    GRANT_ISSUED: "governance.grant.issued.v1",
    GRANT_REVOKED: "governance.grant.revoked.v1",
    DELEGATION_CREATED: "governance.delegation.created.v1",
    MANDATE_ISSUED: "governance.mandate.issued.v1",
    CHANGE_PROPOSAL_SUBMITTED: "governance.change_proposal.submitted.v1",
    APPROVAL_RESOLVED: "governance.approval.resolved.v1",
    AUTHORITY_EPOCH_BUMPED: "governance.authority_epoch.bumped.v1",
};
export const grantIssuedPayloadSchema = z.object({
    grantId: z.string().uuid(),
    scopeId: z.string().uuid(),
    granteePrincipalId: z.string().uuid(),
    capability: z.string().min(1),
    status: grantStatusSchema,
    authorityEpoch: z.number().int().nonnegative(),
    revision: z.number().int().nonnegative(),
});
export const grantRevokedPayloadSchema = z.object({
    grantId: z.string().uuid(),
    scopeId: z.string().uuid(),
    authorityEpoch: z.number().int().nonnegative(),
    revision: z.number().int().nonnegative(),
});
export const changeProposalSubmittedPayloadSchema = z.object({
    proposalId: z.string().uuid(),
    scopeId: z.string().uuid(),
    kind: changeProposalKindSchema,
    payloadHash: z.string().min(1),
    revision: z.number().int().nonnegative(),
});
export const approvalResolvedPayloadSchema = z.object({
    approvalId: z.string().uuid(),
    changeProposalId: z.string().uuid(),
    decision: approvalDecisionSchema,
    resolverPrincipalId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
});
export const authorityEpochBumpedPayloadSchema = z.object({
    scopeId: z.string().uuid(),
    epoch: z.number().int().nonnegative(),
    reason: z.string().min(1),
});
export const mandateIssuedPayloadSchema = z.object({
    mandateId: z.string().uuid(),
    agencyId: z.string().uuid(),
    agentId: z.string().uuid(),
    mandateKind: mandateKindSchema,
    grantId: z.string().uuid(),
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
]);

export type GovernanceEventType = (typeof GOVERNANCE_EVENT_TYPES)[keyof typeof GOVERNANCE_EVENT_TYPES];

export type GrantIssuedPayload = z.infer<typeof grantIssuedPayloadSchema>;
export type GrantRevokedPayload = z.infer<typeof grantRevokedPayloadSchema>;
export type ChangeProposalSubmittedPayload = z.infer<typeof changeProposalSubmittedPayloadSchema>;
export type ApprovalResolvedPayload = z.infer<typeof approvalResolvedPayloadSchema>;
export type AuthorityEpochBumpedPayload = z.infer<typeof authorityEpochBumpedPayloadSchema>;
export type MandateIssuedPayload = z.infer<typeof mandateIssuedPayloadSchema>;
