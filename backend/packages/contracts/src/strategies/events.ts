import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	backtestRunIdSchema,
	deploymentIdSchema,
	signalIdSchema,
	strategiesExecutionModeSchema,
	strategyIdSchema,
	strategyVersionIdSchema,
} from "./types";
export const STRATEGIES_EVENT_TYPES = {
	STRATEGY_REGISTERED: "strategies.strategy.registered.v1",
	VERSION_PUBLISHED: "strategies.version.published.v1",
	BACKTEST_REQUESTED: "strategies.backtest.requested.v1",
	BACKTEST_COMPLETED: "strategies.backtest.completed.v1",
	DEPLOYMENT_ACTIVATED: "strategies.deployment.activated.v1",
	DEPLOYMENT_ROLLED_BACK: "strategies.deployment.rolled_back.v1",
	SIGNAL_EMITTED: "strategies.signal.emitted.v1",
	VERSION_CERTIFIED: "strategies.version.certified.v1",
};
export const strategyRegisteredPayloadSchema = z.object({
	strategyId: strategyIdSchema,
	organizationId: institutionalUuidSchema,
	revision: z.number().int().positive(),
});
export const versionPublishedPayloadSchema = z.object({
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
	organizationId: institutionalUuidSchema,
	versionNumber: z.number().int().positive(),
	sourceHash: z.string().min(32).max(128),
	rulesHash: z.string().min(32).max(128),
	parametersHash: z.string().min(32).max(128),
	executionMode: strategiesExecutionModeSchema,
});
export const backtestRequestedPayloadSchema = z.object({
	backtestRequestId: backtestRunIdSchema,
	organizationId: institutionalUuidSchema,
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
	datasetId: z.string().min(1),
	datasetRevision: z.string().min(1),
	seed: z.string().min(1),
	executionMode: strategiesExecutionModeSchema,
	requestedAt: z.string().datetime(),
});
export const backtestCompletedPayloadSchema = z.object({
	backtestRequestId: backtestRunIdSchema,
	organizationId: institutionalUuidSchema,
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
	resultRef: z.string().min(1).nullable(),
	metricsHash: z
		.string()
		.regex(/^[a-f0-9]{64}$/i)
		.nullable(),
	status: z.enum(["COMPLETED", "FAILED"]),
});
export const deploymentActivatedPayloadSchema = z.object({
	deploymentId: deploymentIdSchema,
	organizationId: institutionalUuidSchema,
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
	executionMode: strategiesExecutionModeSchema,
	portfolioId: z.string().min(1).nullable(),
	bindingHash: z.string().regex(/^[a-f0-9]{64}$/i),
});
export const signalEmittedPayloadSchema = z.object({
	signalId: signalIdSchema,
	organizationId: institutionalUuidSchema,
	strategyId: strategyIdSchema,
	deploymentId: deploymentIdSchema.nullable(),
	instrumentRefs: z.array(z.string().min(1)).min(1),
	valueRef: z.string().min(1),
	expiresAt: z.string().datetime(),
});
export const versionCertifiedPayloadSchema = z.object({
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
	organizationId: institutionalUuidSchema,
	certificationId: z.string().regex(/^evl_crt_[0-9a-f-]{36}$/i),
	revision: z.number().int().positive(),
	issuedAt: z.string().datetime(),
});
export const strategiesEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(STRATEGIES_EVENT_TYPES.STRATEGY_REGISTERED),
		payload: strategyRegisteredPayloadSchema,
	}),
	z.object({
		eventType: z.literal(STRATEGIES_EVENT_TYPES.VERSION_PUBLISHED),
		payload: versionPublishedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(STRATEGIES_EVENT_TYPES.BACKTEST_REQUESTED),
		payload: backtestRequestedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(STRATEGIES_EVENT_TYPES.BACKTEST_COMPLETED),
		payload: backtestCompletedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(STRATEGIES_EVENT_TYPES.DEPLOYMENT_ACTIVATED),
		payload: deploymentActivatedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(STRATEGIES_EVENT_TYPES.SIGNAL_EMITTED),
		payload: signalEmittedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(STRATEGIES_EVENT_TYPES.VERSION_CERTIFIED),
		payload: versionCertifiedPayloadSchema,
	}),
]);

export type StrategiesEventType =
	(typeof STRATEGIES_EVENT_TYPES)[keyof typeof STRATEGIES_EVENT_TYPES];
