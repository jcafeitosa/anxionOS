import { z } from "zod";

export const PLATFORM_SLO_SNAPSHOT_SCHEMA_VERSION = "1.0.0";

export const platformSloRouteLatencySchema = z.object({
	prefix: z.string(),
	requestCount: z.number().int().nonnegative(),
	errorCount: z.number().int().nonnegative(),
	errorRatePercent: z.number().nonnegative(),
	p50Ms: z.number().nonnegative(),
	p95Ms: z.number().nonnegative(),
	p99Ms: z.number().nonnegative(),
});

export const platformSloEventingLagSchema = z.object({
	channel: z.string(),
	ownerDomain: z.string().optional(),
	consumer: z.string().optional(),
	sampleCount: z.number().int().nonnegative(),
	alertCount: z.number().int().nonnegative(),
	p50Ms: z.number().nonnegative(),
	p95Ms: z.number().nonnegative(),
	p99Ms: z.number().nonnegative(),
});

export const platformSloCostSignalSchema = z.object({
	provider: z.string(),
	capability: z.string(),
	unit: z.string(),
	quantity: z.number().nonnegative(),
	estimatedCostUsd: z.number().nonnegative().optional(),
});

export const platformSloCapacitySignalSchema = z.object({
	resource: z.string(),
	utilizationPercent: z.number().min(0).max(100).optional(),
	queuedJobs: z.number().int().nonnegative().optional(),
	status: z.enum(["ok", "warn", "critical", "unknown"]),
});

export const platformSloSnapshotSchema = z.object({
	schemaVersion: z.literal(PLATFORM_SLO_SNAPSHOT_SCHEMA_VERSION),
	generatedAt: z.string().datetime(),
	scope: z.literal("platform"),
	api: z.object({
		totalRequests: z.number().int().nonnegative(),
		totalErrors: z.number().int().nonnegative(),
		errorRatePercent: z.number().nonnegative(),
		routes: z.array(platformSloRouteLatencySchema),
	}),
	eventing: z.object({
		channels: z.array(platformSloEventingLagSchema),
	}),
	capacity: z.object({
		signalsAvailable: z.boolean(),
		signals: z.array(platformSloCapacitySignalSchema),
		note: z.string(),
	}),
	cost: z.object({
		signalsAvailable: z.boolean(),
		signals: z.array(platformSloCostSignalSchema),
		note: z.string(),
	}),
});

export type PlatformSloRouteLatency = z.infer<
	typeof platformSloRouteLatencySchema
>;
export type PlatformSloEventingLag = z.infer<
	typeof platformSloEventingLagSchema
>;
export type PlatformSloCostSignal = z.infer<typeof platformSloCostSignalSchema>;
export type PlatformSloCapacitySignal = z.infer<
	typeof platformSloCapacitySignalSchema
>;
export type PlatformSloSnapshot = z.infer<typeof platformSloSnapshotSchema>;
