import { z } from "zod";
import {
	decisionIdSchema,
	proposalIdSchema,
	proposalKindSchema,
	decisionScopeSchema,
	decisionEngineStatusSchema,
} from "./types";

const EVIDENCE_SECRET_PATTERN =
	/(api[_-]?key|token|secret|password|bearer)\s*[:=]/i;

export const EVIDENCE_SECRET_REJECTION_MESSAGE =
	"Evidence must not contain secrets or tokens";

/** Shared anti-secret guard for decision evidence text fields (claim, uri, checksum). */
export function isEvidenceFieldFreeOfSecrets(value: string): boolean {
	return !EVIDENCE_SECRET_PATTERN.test(value);
}

const secretFreeEvidenceString = (minLength?: number) => {
	let schema = z.string();
	if (minLength !== undefined) {
		schema = schema.min(minLength);
	}
	return schema.refine(isEvidenceFieldFreeOfSecrets, {
		message: EVIDENCE_SECRET_REJECTION_MESSAGE,
	});
};

const optionalSecretFreeEvidenceString = () =>
	z
		.string()
		.refine(isEvidenceFieldFreeOfSecrets, {
			message: EVIDENCE_SECRET_REJECTION_MESSAGE,
		})
		.optional();

export const evidenceReferenceSchema = z.object({
	id: z.string().uuid(),
	source: z.enum(["on_chain", "off_chain", "audit", "log"]),
	uri: z.string().url().optional(),
	checksum: z.string().optional(),
});

export const affectedEntitySchema = z.object({
	id: z.string(),
	kind: z.enum(["proposal", "grant", "agent", "organization", "asset"]),
	scopeId: z.string(),
	role: z.enum(["primary", "secondary", "observer"]).optional(),
});

export const alternativeProposalSchema = z.object({
	id: z.string(),
	kind: proposalKindSchema,
	rationale: z.string(),
	status: z.enum(["REJECTED", "SUPERSEDED"]),
	score: z.number().optional(),
});

export const authorityReferenceSchema = z.object({
	id: z.string().uuid(),
	kind: z.enum(["governance", "agent", "system"]),
	minimumEpochs: z.number().int().nonnegative(),
	grantedBy: z.string(),
	grantedAt: z.string().datetime(),
});

export const approvalSchema = z.object({
	id: z.string().uuid(),
	approverId: z.string(),
	approvalKind: z.enum(["executive", "manager", "system"]),
	decisionId: decisionIdSchema,
	grantedAt: z.string().datetime(),
	conditions: z.array(z.string()).optional(),
});

export const dispositionSchema = z.object({
	id: z.string().uuid(),
	decisionId: decisionIdSchema,
	outcome: z.enum(["UPHELD", "OVERTURNED", "MODIFIED", "EXPIRED"]),
	reason: z.string(),
	revisedBy: z.string().optional(),
	revisedAt: z.string().datetime().optional(),
});

export const decisionAuthorityRequirementSchema = z.object({
	level: z.enum(["L0", "L1", "L2", "L3", "L4", "L5", "L6"]),
	reason: z.string().min(1),
});

export const decisionAggregateReferencesSchema = z.object({
	decisionId: decisionIdSchema,
	proposalId: proposalIdSchema,
	changeProposalId: z.string().uuid().optional(),
	approvalId: z.string().uuid().optional(),
	grantId: z.string().uuid().optional(),
});

export const decisionEvidenceSchema = evidenceReferenceSchema.extend({
	uri: z
		.string()
		.url()
		.refine(isEvidenceFieldFreeOfSecrets, {
			message: EVIDENCE_SECRET_REJECTION_MESSAGE,
		})
		.optional(),
	checksum: optionalSecretFreeEvidenceString(),
	claim: secretFreeEvidenceString(1),
});

export const decisionRecordSchema = z.object({
	recordId: z.string().uuid(),
	schemaVersion: z.literal("decision-record.v1"),
	scope: decisionScopeSchema,
	status: decisionEngineStatusSchema,
	title: z.string().min(1),
	rationale: z.string().min(1),
	references: decisionAggregateReferencesSchema,
	evidence: z.array(decisionEvidenceSchema).min(1),
	alternatives: z.array(alternativeProposalSchema),
	affectedEntities: z.array(affectedEntitySchema).min(1),
	authorityRequirement: decisionAuthorityRequirementSchema,
	authorityReferences: z.array(authorityReferenceSchema).min(1),
	approvals: z.array(approvalSchema),
	disposition: dispositionSchema.optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
}).superRefine((record, context) => {
	for (const evidence of record.evidence) {
		if (!evidence.uri && !evidence.checksum) {
			context.addIssue({ code: z.ZodIssueCode.custom, path: ["evidence"], message: "Evidence requires uri or checksum" });
		}
	}
});

export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;
export type AffectedEntity = z.infer<typeof affectedEntitySchema>;
export type AlternativeProposal = z.infer<typeof alternativeProposalSchema>;
export type AuthorityReference = z.infer<typeof authorityReferenceSchema>;
export type Approval = z.infer<typeof approvalSchema>;
export type Disposition = z.infer<typeof dispositionSchema>;
export type DecisionAuthorityRequirement = z.infer<typeof decisionAuthorityRequirementSchema>;
export type DecisionAggregateReferences = z.infer<typeof decisionAggregateReferencesSchema>;
export type DecisionEvidence = z.infer<typeof decisionEvidenceSchema>;
export type DecisionRecord = z.infer<typeof decisionRecordSchema>;