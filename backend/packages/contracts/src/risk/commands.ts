import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	checkResultSchema,
	decimalAmountSchema,
	riskCheckIdSchema,
	riskExecutionModeSchema,
	riskKillSwitchIdSchema,
	riskKillSwitchScopeSchema,
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
	killSwitchId: riskKillSwitchIdSchema.optional(),
	riskEpoch: z.number().int().nonnegative().optional(),
	killSwitchActive: z.boolean().optional(),
	checkResult: checkResultSchema.optional(),
	denyReasonCode: z.string().optional(),
});
export const activateLimitPolicyCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	policyVersion: z.string().min(1).max(64),
	maxNotional: decimalAmountSchema,
	maxLeverage: decimalAmountSchema.optional(),
	riskEpoch: z.number().int().nonnegative(),
});
export const runPreTradeCheckCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	portfolioId: z.string().min(1),
	intentHash: z.string().min(1),
	notionalAmount: decimalAmountSchema,
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
	executionMode: riskExecutionModeSchema,
});
export const activateKillSwitchCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	reason: z.string().min(1).max(512),
	activatedBy: z.string().min(1).max(128),
	scope: riskKillSwitchScopeSchema.default("ORGANIZATION"),
	portfolioId: z.string().min(1).optional(),
});
export const releaseKillSwitchCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	releasedBy: z.string().min(1).max(128),
	scope: riskKillSwitchScopeSchema.default("ORGANIZATION"),
	portfolioId: z.string().min(1).optional(),
});

export type RiskCommandResult = z.infer<typeof riskCommandResultSchema>;

export type ActivateLimitPolicyCommand = z.infer<
	typeof activateLimitPolicyCommandSchema
>;

export type RunPreTradeCheckCommand = z.infer<
	typeof runPreTradeCheckCommandSchema
>;

export type ActivateKillSwitchCommand = z.infer<
	typeof activateKillSwitchCommandSchema
>;

export type ReleaseKillSwitchCommand = z.infer<
	typeof releaseKillSwitchCommandSchema
>;
