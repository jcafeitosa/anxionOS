import { z } from "zod";
import {
	decisionIdSchema,
	decisionsExecutionModeSchema,
	intentIdSchema,
	orderSideSchema,
	proposalIdSchema,
	proposalKindSchema,
} from "./types";
export const DECISIONS_EVENT_TYPES = {
	PROPOSAL_CREATED: "decisions.proposal.created.v1",
	AUTHORITY_CHECKED: "decisions.authority.checked.v1",
	INTENT_SUBMITTED: "decisions.intent.submitted.v1",
};
export const proposalCreatedPayloadSchema = z.object({
	decisionId: decisionIdSchema,
	proposalId: proposalIdSchema,
	organizationId: z.string().uuid(),
	grantId: z.string().uuid(),
	expectedAuthorityEpoch: z.number().int().nonnegative(),
	proposalKind: proposalKindSchema,
	correlationId: z.string().uuid(),
});
export const authorityCheckedPayloadSchema = z.object({
	decisionId: decisionIdSchema,
	organizationId: z.string().uuid(),
	grantId: z.string().uuid(),
	authorityEpoch: z.number().int().nonnegative(),
});
export const intentSubmittedPayloadSchema = z.object({
	decisionId: decisionIdSchema,
	intentId: intentIdSchema,
	organizationId: z.string().uuid(),
	intentHash: z.string().min(1),
	instrumentId: z.string().uuid(),
	side: orderSideSchema,
	quantity: z.string(),
	price: z.string(),
	executionMode: decisionsExecutionModeSchema,
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
		eventType: z.literal(DECISIONS_EVENT_TYPES.INTENT_SUBMITTED),
		payload: intentSubmittedPayloadSchema,
	}),
]);

export type DecisionsEventType =
	(typeof DECISIONS_EVENT_TYPES)[keyof typeof DECISIONS_EVENT_TYPES];
