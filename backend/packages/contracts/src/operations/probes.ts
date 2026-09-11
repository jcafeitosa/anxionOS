import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import { operationsHealthStatusSchema } from "./types";

export const DEFAULT_HEALTH_PROBE_TIMEOUT_MS = 3_000;
export const DEFAULT_HEALTH_STALE_THRESHOLD_MS = 60_000;

export const healthProbeOutcomeSchema = z.enum(["ok", "error", "timeout"]);

export const serviceHealthProbeDetailsSchema = z.object({
	origin: z.literal("probe"),
	outcome: healthProbeOutcomeSchema,
	durationMs: z.number().int().nonnegative(),
	message: z.string().optional(),
	timedOut: z.boolean().optional(),
});

export const executeServiceHealthProbeCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	serviceId: z.string().min(1).max(128),
	checkedAt: z.string().datetime().optional(),
});

export const serviceHealthSnapshotSchema = z.object({
	healthCheckId: z.string().min(1),
	organizationId: institutionalUuidSchema,
	serviceId: z.string().min(1).max(128),
	status: operationsHealthStatusSchema,
	checkedAt: z.string().datetime(),
	revision: z.number().int().nonnegative(),
	isStale: z.boolean(),
	probeDetails: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type HealthProbeOutcome = z.infer<typeof healthProbeOutcomeSchema>;
export type ServiceHealthProbeDetails = z.infer<
	typeof serviceHealthProbeDetailsSchema
>;
export type ExecuteServiceHealthProbeCommand = z.infer<
	typeof executeServiceHealthProbeCommandSchema
>;
export type ServiceHealthSnapshot = z.infer<typeof serviceHealthSnapshotSchema>;
