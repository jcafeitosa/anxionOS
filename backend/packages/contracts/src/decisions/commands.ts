import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	approvalIdSchema,
	decimalAmountSchema,
	decisionIdSchema,
	decisionsExecutionModeSchema,
	dispositionIdSchema,
	dispositionKindSchema,
	dispositionOutcomeSchema,
	evidenceManifestEntrySchema,
	evidenceManifestIdSchema,
	intentIdSchema,
	orderSideSchema,
	proposalIdSchema,
	proposalKindSchema,
} from "./types";
export const decisionsCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	decisionId: decisionIdSchema.optional(),
	proposalId: proposalIdSchema.optional(),
	intentId: intentIdSchema.optional(),
	approvalId: approvalIdSchema.optional(),
	dispositionId: dispositionIdSchema.optional(),
	evidenceManifestId: evidenceManifestIdSchema.optional(),
	waitingHuman: z.boolean().optional(),
});
export const proposeDecisionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	grantId: institutionalUuidSchema,
	expectedAuthorityEpoch: z.number().int().nonnegative(),
	correlationId: institutionalUuidSchema,
	proposerId: institutionalUuidSchema.optional(),
	portfolioId: z.string().min(1).optional(),
	capitalAccountId: z.string().min(1).optional(),
	rationale: z.string().min(1).max(2000).optional(),
	proposalKind: proposalKindSchema.default("TRADE"),
});
export const checkAuthorityCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	decisionId: decisionIdSchema,
	grantId: institutionalUuidSchema,
	authorityEpoch: z.number().int().nonnegative(),
	intentHash: z.string().min(1).optional(),
});
export const requestHumanApprovalCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	decisionId: decisionIdSchema,
	proposerId: institutionalUuidSchema,
	runId: z.string().min(1).optional(),
	operationId: institutionalUuidSchema.optional(),
	idempotencyKey: z.string().min(1).optional(),
});
export const recordApprovalCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	decisionId: decisionIdSchema,
	approverId: institutionalUuidSchema,
});
export const recordDispositionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	decisionId: decisionIdSchema,
	dispositionKind: dispositionKindSchema,
	outcome: dispositionOutcomeSchema,
	reason: z.string().min(1).max(2000),
	approverId: institutionalUuidSchema,
	intentHash: z.string().min(1).optional(),
});
export const recordEvidenceManifestCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	decisionId: decisionIdSchema,
	entries: z.array(evidenceManifestEntrySchema).min(1),
	knowledgeEventId: institutionalUuidSchema.optional(),
});

export const submitIntentCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	decisionId: decisionIdSchema,
	intentHash: z.string().min(1),
	instrumentId: institutionalUuidSchema,
	side: orderSideSchema,
	quantity: decimalAmountSchema,
	price: decimalAmountSchema,
	executionMode: decisionsExecutionModeSchema,
});

export type DecisionsCommandResult = z.infer<
	typeof decisionsCommandResultSchema
>;

export type ProposeDecisionCommand = z.infer<
	typeof proposeDecisionCommandSchema
>;

export type CheckAuthorityCommand = z.infer<typeof checkAuthorityCommandSchema>;

export type RequestHumanApprovalCommand = z.infer<
	typeof requestHumanApprovalCommandSchema
>;

export type RecordApprovalCommand = z.infer<typeof recordApprovalCommandSchema>;

export type RecordDispositionCommand = z.infer<
	typeof recordDispositionCommandSchema
>;

export type RecordEvidenceManifestCommand = z.infer<
	typeof recordEvidenceManifestCommandSchema
>;

export type SubmitIntentCommand = z.infer<typeof submitIntentCommandSchema>;
