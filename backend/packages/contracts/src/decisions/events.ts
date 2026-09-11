import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	approvalIdSchema,
	decisionIdSchema,
	decisionsExecutionModeSchema,
	dispositionIdSchema,
	dispositionKindSchema,
	dispositionOutcomeSchema,
	intentIdSchema,
	orderSideSchema,
	proposalIdSchema,
	proposalKindSchema,
} from "./types";
export const DECISIONS_EVENT_TYPES = {
	PROPOSAL_CREATED: "decisions.proposal.created.v1",
	AUTHORITY_CHECKED: "decisions.authority.checked.v1",
	APPROVAL_REQUESTED: "decisions.approval.requested.v1",
	APPROVAL_RECORDED: "decisions.approval.recorded.v1",
	DISPOSITION_RECORDED: "decisions.disposition.recorded.v1",
	INTENT_SUBMITTED: "decisions.intent.submitted.v1",
	EVIDENCE_MANIFEST_RECORDED: "decisions.evidence_manifest.recorded.v1",
};
export const proposalCreatedPayloadSchema = z.object({
	decisionId: decisionIdSchema,
	proposalId: proposalIdSchema,
	organizationId: institutionalUuidSchema,
	grantId: institutionalUuidSchema,
	expectedAuthorityEpoch: z.number().int().nonnegative(),
	proposalKind: proposalKindSchema,
	correlationId: institutionalUuidSchema,
});
export const authorityCheckedPayloadSchema = z.object({
	decisionId: decisionIdSchema,
	organizationId: institutionalUuidSchema,
	grantId: institutionalUuidSchema,
	authorityEpoch: z.number().int().nonnegative(),
});
export const approvalRequestedPayloadSchema = z.object({
	decisionId: decisionIdSchema,
	organizationId: institutionalUuidSchema,
	approvalId: approvalIdSchema,
	proposerId: institutionalUuidSchema,
	runId: z.string().min(1).optional(),
	operationId: institutionalUuidSchema.optional(),
	correlationId: institutionalUuidSchema,
});
export const approvalRecordedPayloadSchema = z.object({
	decisionId: decisionIdSchema,
	organizationId: institutionalUuidSchema,
	approvalId: approvalIdSchema,
	approverId: institutionalUuidSchema,
	proposerId: institutionalUuidSchema,
});
export const dispositionRecordedPayloadSchema = z.object({
	decisionId: decisionIdSchema,
	organizationId: institutionalUuidSchema,
	dispositionId: dispositionIdSchema,
	dispositionKind: dispositionKindSchema,
	outcome: dispositionOutcomeSchema,
	reason: z.string().min(1),
	approverId: institutionalUuidSchema,
	intentHash: z.string().min(1).optional(),
});
export const intentSubmittedPayloadSchema = z.object({
	decisionId: decisionIdSchema,
	intentId: intentIdSchema,
	organizationId: institutionalUuidSchema,
	intentHash: z.string().min(1),
	instrumentId: institutionalUuidSchema,
	side: orderSideSchema,
	quantity: z.string(),
	price: z.string(),
	executionMode: decisionsExecutionModeSchema,
});
export const evidenceManifestRecordedPayloadSchema = z.object({
	decisionId: decisionIdSchema,
	organizationId: institutionalUuidSchema,
	evidenceManifestId: z.string().regex(/^dc_emf_[0-9a-f-]{36}$/i),
	manifestHash: z.string().min(32).max(128),
	entryCount: z.number().int().positive(),
});
export const decisionsEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(DECISIONS_EVENT_TYPES.PROPOSAL_CREATED),
		payload: proposalCreatedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(DECISIONS_EVENT_TYPES.AUTHORITY_CHECKED),
		payload: authorityCheckedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(DECISIONS_EVENT_TYPES.APPROVAL_REQUESTED),
		payload: approvalRequestedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(DECISIONS_EVENT_TYPES.APPROVAL_RECORDED),
		payload: approvalRecordedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(DECISIONS_EVENT_TYPES.DISPOSITION_RECORDED),
		payload: dispositionRecordedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(DECISIONS_EVENT_TYPES.INTENT_SUBMITTED),
		payload: intentSubmittedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(DECISIONS_EVENT_TYPES.EVIDENCE_MANIFEST_RECORDED),
		payload: evidenceManifestRecordedPayloadSchema,
	}),
]);

export type DecisionsEventType =
	(typeof DECISIONS_EVENT_TYPES)[keyof typeof DECISIONS_EVENT_TYPES];
