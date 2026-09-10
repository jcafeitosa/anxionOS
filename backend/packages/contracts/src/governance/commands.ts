import { z } from "zod";
import {
	assignAutonomyLevelCommandSchema,
	transitionAutonomyLevelCommandSchema,
} from "./autonomy-policy";
import { changeProposalKindSchema, mandateKindSchema } from "./types";

export {
	assignAutonomyLevelCommandSchema,
	transitionAutonomyLevelCommandSchema,
};
export type {
	AssignAutonomyLevelCommand,
	TransitionAutonomyLevelCommand,
} from "./autonomy-policy";
export const governanceCommandResultSchema = z.object({
	aggregateId: z.string().uuid(),
	revision: z.number().int().nonnegative(),
	authorityEpoch: z.number().int().nonnegative().optional(),
	idempotentReplay: z.boolean().optional(),
});
export const issueGrantCommandSchema = z.object({
	commandId: z.string().uuid(),
	scopeId: z.string().uuid(),
	granteePrincipalId: z.string().uuid(),
	capability: z.string().min(1),
	resourceRef: z.string().min(1).optional(),
	validUntil: z.string().datetime().optional(),
});
export const revokeGrantCommandSchema = z.object({
	commandId: z.string().uuid(),
	grantId: z.string().uuid(),
	reason: z.string().max(500).optional(),
});
export const issueMandateCommandSchema = z.object({
	commandId: z.string().uuid(),
	grantId: z.string().uuid(),
	agentId: z.string().uuid(),
	mandateKind: mandateKindSchema,
});
export const activateBreakGlassCommandSchema = z.object({
	commandId: z.string().uuid(),
	scopeId: z.string().uuid(),
	granteePrincipalId: z.string().uuid(),
	capability: z.string().min(1),
	reason: z.string().min(1).max(500),
	expiresAt: z.string().datetime(),
	incidentRef: z.string().min(1).max(200).optional(),
});
export const createDelegationCommandSchema = z.object({
	commandId: z.string().uuid(),
	parentGrantId: z.string().uuid(),
	delegatePrincipalId: z.string().uuid(),
	capabilitySubset: z.array(z.string().min(1)).min(1),
	validUntil: z.string().datetime(),
	intentHash: z.string().min(1).optional(),
});
export const submitChangeProposalCommandSchema = z.object({
	commandId: z.string().uuid(),
	scopeId: z.string().uuid(),
	kind: changeProposalKindSchema,
	payloadHash: z.string().min(1),
});
export const resolveApprovalCommandSchema = z.object({
	commandId: z.string().uuid(),
	changeProposalId: z.string().uuid(),
	decision: z.enum(["APPROVED", "REJECTED"]),
	reason: z.string().max(500).optional(),
});

export type GovernanceCommandResult = z.infer<
	typeof governanceCommandResultSchema
>;

export type IssueGrantCommand = z.infer<typeof issueGrantCommandSchema>;
export type RevokeGrantCommand = z.infer<typeof revokeGrantCommandSchema>;
export type IssueMandateCommand = z.infer<typeof issueMandateCommandSchema>;
export type ActivateBreakGlassCommand = z.infer<
	typeof activateBreakGlassCommandSchema
>;
export type CreateDelegationCommand = z.infer<
	typeof createDelegationCommandSchema
>;
export type SubmitChangeProposalCommand = z.infer<
	typeof submitChangeProposalCommandSchema
>;
export type ResolveApprovalCommand = z.infer<
	typeof resolveApprovalCommandSchema
>;
