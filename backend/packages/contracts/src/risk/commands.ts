import { z } from "zod";
import {
	checkResultSchema,
	decimalAmountSchema,
	riskCheckIdSchema,
	riskExecutionModeSchema,
	riskPermitIdSchema,
	riskPolicyIdSchema,
} from "./types";
export const riskCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	policyId: riskPolicyIdSchema.optional(),
	checkId: riskCheckIdSchema.optional(),
	permitId: riskPermitIdSchema.optional(),
	checkResult: checkResultSchema.optional(),
	denyReasonCode: z.string().optional(),
});
export const activateLimitPolicyCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	policyVersion: z.string().min(1).max(64),
	maxNotional: decimalAmountSchema,
	maxLeverage: decimalAmountSchema.optional(),
	riskEpoch: z.number().int().nonnegative(),
});
export const runPreTradeCheckCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	portfolioId: z.string().min(1),
	intentHash: z.string().min(1),
	notionalAmount: decimalAmountSchema,
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
	executionMode: riskExecutionModeSchema,
});

export type RiskCommandResult = z.infer<typeof riskCommandResultSchema>;

export type ActivateLimitPolicyCommand = z.infer<
	typeof activateLimitPolicyCommandSchema
>;

export type RunPreTradeCheckCommand = z.infer<
	typeof runPreTradeCheckCommandSchema
>;
