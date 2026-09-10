import { z } from "zod";
import {
	operationsHealthCheckIdSchema,
	operationsHealthStatusSchema,
	operationsIncidentIdSchema,
	operationsIncidentSeveritySchema,
} from "./types";
export const operationsCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	healthCheckId: operationsHealthCheckIdSchema.optional(),
	incidentId: operationsIncidentIdSchema.optional(),
});
export const registerHealthCheckCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	serviceId: z.string().min(1).max(128),
	status: operationsHealthStatusSchema,
	checkedAt: z.string().datetime(),
	probeDetails: z.record(z.string(), z.unknown()).optional(),
});
export const createIncidentCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	title: z.string().min(1).max(256),
	description: z.string().max(4096).optional(),
	severity: operationsIncidentSeveritySchema,
	serviceId: z.string().min(1).max(128).optional(),
});
/** HTTP alias per R04 openIncident */
export const openIncidentCommandSchema = createIncidentCommandSchema;

export type OperationsCommandResult = z.infer<
	typeof operationsCommandResultSchema
>;

export type RegisterHealthCheckCommand = z.infer<
	typeof registerHealthCheckCommandSchema
>;

export type CreateIncidentCommand = z.infer<typeof createIncidentCommandSchema>;
/** HTTP alias per R04 openIncident */

export type OpenIncidentCommand = CreateIncidentCommand;
