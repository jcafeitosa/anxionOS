import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	assignAutonomyLevelCommandSchema,
	transitionAutonomyLevelCommandSchema,
} from "./autonomy-policy";
import { changeProposalKindSchema, mandateKindSchema } from "./types";

export type {
	AssignAutonomyLevelCommand,
	TransitionAutonomyLevelCommand,
} from "./autonomy-policy";
export {
	assignAutonomyLevelCommandSchema,
	transitionAutonomyLevelCommandSchema,
};
export const governanceCommandResultSchema = z.object({
	aggregateId: institutionalUuidSchema,
	revision: z.number().int().nonnegative(),
	authorityEpoch: z.number().int().nonnegative().optional(),
	idempotentReplay: z.boolean().optional(),
});
export const issueGrantCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	scopeId: institutionalUuidSchema,
	granteePrincipalId: institutionalUuidSchema,
	capability: z.string().min(1),
	resourceRef: z.string().min(1).optional(),
	validUntil: z.string().datetime().optional(),
});
export const revokeGrantCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	grantId: institutionalUuidSchema,
	reason: z.string().max(500).optional(),
});
export const issueMandateCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	grantId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	mandateKind: mandateKindSchema,
});
export const activateBreakGlassCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	scopeId: institutionalUuidSchema,
	granteePrincipalId: institutionalUuidSchema,
	capability: z.string().min(1),
	reason: z.string().min(1).max(500),
	expiresAt: z.string().datetime(),
	incidentRef: z.string().min(1).max(200).optional(),
});
export const createDelegationCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	parentGrantId: institutionalUuidSchema,
	delegatePrincipalId: institutionalUuidSchema,
	capabilitySubset: z.array(z.string().min(1)).min(1),
	validUntil: z.string().datetime(),
	intentHash: z.string().min(1).optional(),
});
export const submitChangeProposalCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	scopeId: institutionalUuidSchema,
	kind: changeProposalKindSchema,
	payloadHash: z.string().min(1),
});
export const resolveApprovalCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	changeProposalId: institutionalUuidSchema,
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
