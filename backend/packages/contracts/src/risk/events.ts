import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	checkResultSchema,
	riskCheckIdSchema,
	riskExecutionModeSchema,
	riskKillSwitchIdSchema,
	riskKillSwitchScopeSchema,
	riskPermitIdSchema,
} from "./types";
export const RISK_EVENT_TYPES = {
	CHECK_COMPLETED: "risk.check.completed.v1",
	PERMIT_ISSUED: "risk.permit.issued.v1",
	PERMIT_REVOKED: "risk.permit.revoked.v1",
	EPOCH_BUMPED: "risk.epoch.bumped.v1",
	KILL_SWITCH_ACTIVATED: "risk.kill_switch.activated.v1",
	KILL_SWITCH_RELEASED: "risk.kill_switch.released.v1",
};
export const checkCompletedPayloadSchema = z.object({
	checkId: riskCheckIdSchema,
	organizationId: institutionalUuidSchema,
	portfolioId: z.string().min(1),
	intentHash: z.string().min(1),
	checkResult: checkResultSchema,
	denyReasonCode: z.string().optional(),
	notionalAmount: z.string(),
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
	executionMode: riskExecutionModeSchema,
});
export const permitIssuedPayloadSchema = z.object({
	permitId: riskPermitIdSchema,
	checkId: riskCheckIdSchema,
	organizationId: institutionalUuidSchema,
	intentHash: z.string().min(1),
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
});
export const permitRevokedPayloadSchema = z.object({
	permitId: riskPermitIdSchema,
	checkId: riskCheckIdSchema,
	organizationId: institutionalUuidSchema,
	intentHash: z.string().min(1),
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
	currentRiskEpoch: z.number().int().nonnegative(),
	revokedReason: z.string().min(1),
});
export const riskEpochBumpedPayloadSchema = z.object({
	organizationId: institutionalUuidSchema,
	previousRiskEpoch: z.number().int().nonnegative(),
	currentRiskEpoch: z.number().int().nonnegative(),
	reason: z.string().min(1),
});
export const killSwitchActivatedPayloadSchema = z.object({
	killSwitchId: riskKillSwitchIdSchema,
	organizationId: institutionalUuidSchema,
	scope: riskKillSwitchScopeSchema,
	portfolioId: z.string().min(1).optional(),
	reason: z.string().min(1),
	activatedBy: z.string().min(1),
	riskEpoch: z.number().int().nonnegative(),
});
export const killSwitchReleasedPayloadSchema = z.object({
	killSwitchId: riskKillSwitchIdSchema,
	organizationId: institutionalUuidSchema,
	scope: riskKillSwitchScopeSchema,
	portfolioId: z.string().min(1).optional(),
	releasedBy: z.string().min(1),
	riskEpoch: z.number().int().nonnegative(),
});
export const riskEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(RISK_EVENT_TYPES.CHECK_COMPLETED),
		payload: checkCompletedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(RISK_EVENT_TYPES.PERMIT_ISSUED),
		payload: permitIssuedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(RISK_EVENT_TYPES.PERMIT_REVOKED),
		payload: permitRevokedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(RISK_EVENT_TYPES.EPOCH_BUMPED),
		payload: riskEpochBumpedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(RISK_EVENT_TYPES.KILL_SWITCH_ACTIVATED),
		payload: killSwitchActivatedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(RISK_EVENT_TYPES.KILL_SWITCH_RELEASED),
		payload: killSwitchReleasedPayloadSchema,
	}),
]);

export type RiskEventType =
	(typeof RISK_EVENT_TYPES)[keyof typeof RISK_EVENT_TYPES];
