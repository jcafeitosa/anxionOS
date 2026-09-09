import { z } from "zod";
import { decimalAmountSchema, decisionIdSchema, decisionsExecutionModeSchema, intentIdSchema, orderSideSchema, proposalIdSchema, proposalKindSchema, } from "./types";
export const decisionsCommandResultSchema = z.object({
    aggregateId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    idempotentReplay: z.boolean().optional(),
    decisionId: decisionIdSchema.optional(),
    proposalId: proposalIdSchema.optional(),
    intentId: intentIdSchema.optional(),
});
export const proposeDecisionCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    grantId: z.string().uuid(),
    expectedAuthorityEpoch: z.number().int().nonnegative(),
    correlationId: z.string().uuid(),
    portfolioId: z.string().min(1).optional(),
    capitalAccountId: z.string().min(1).optional(),
    rationale: z.string().min(1).max(2000).optional(),
    proposalKind: proposalKindSchema.default("TRADE"),
});
export const checkAuthorityCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    decisionId: decisionIdSchema,
    grantId: z.string().uuid(),
    authorityEpoch: z.number().int().nonnegative(),
});
export const submitIntentCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    decisionId: decisionIdSchema,
    intentHash: z.string().min(1),
    instrumentId: z.string().uuid(),
    side: orderSideSchema,
    quantity: decimalAmountSchema,
    price: decimalAmountSchema,
    executionMode: decisionsExecutionModeSchema,
});

export type DecisionsCommandResult = z.infer<typeof decisionsCommandResultSchema>;

export type ProposeDecisionCommand = z.infer<typeof proposeDecisionCommandSchema>;

export type CheckAuthorityCommand = z.infer<typeof checkAuthorityCommandSchema>;

export type SubmitIntentCommand = z.infer<typeof submitIntentCommandSchema>;
