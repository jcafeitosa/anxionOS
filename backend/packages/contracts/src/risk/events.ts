import { z } from "zod";
import { checkResultSchema, riskCheckIdSchema, riskExecutionModeSchema, riskPermitIdSchema, } from "./types";
export const RISK_EVENT_TYPES = {
    CHECK_COMPLETED: "risk.check.completed.v1",
    PERMIT_ISSUED: "risk.permit.issued.v1",
};
export const checkCompletedPayloadSchema = z.object({
    checkId: riskCheckIdSchema,
    organizationId: z.string().uuid(),
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
    organizationId: z.string().uuid(),
    intentHash: z.string().min(1),
    authorityEpoch: z.number().int().nonnegative(),
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
]);

export type RiskEventType = (typeof RISK_EVENT_TYPES)[keyof typeof RISK_EVENT_TYPES];
