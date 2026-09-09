import { z } from "zod";
export const governanceScopeKindSchema = z.enum(["agency", "organization"]);
export const grantStatusSchema = z.enum(["active", "revoked", "expired"]);
export const mandateKindSchema = z.enum(["ceo", "operator", "audit"]);
export const changeProposalKindSchema = z.enum([
    "SOFTWARE",
    "INSTITUTIONAL",
    "HIERARCHY_MODE",
]);
export const changeProposalStatusSchema = z.enum([
    "pending",
    "approved",
    "rejected",
    "superseded",
]);
export const approvalDecisionSchema = z.enum(["APPROVED", "REJECTED"]);

export type GovernanceScopeKind = z.infer<typeof governanceScopeKindSchema>;
export type GrantStatus = z.infer<typeof grantStatusSchema>;
export type MandateKind = z.infer<typeof mandateKindSchema>;
export type ChangeProposalKind = z.infer<typeof changeProposalKindSchema>;
export type ChangeProposalStatus = z.infer<typeof changeProposalStatusSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
