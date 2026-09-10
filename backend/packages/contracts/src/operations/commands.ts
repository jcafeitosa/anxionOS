import { z } from "zod";
import {
	operationsHealthCheckIdSchema,
	operationsHealthStatusSchema,
	operationsIncidentIdSchema,
	operationsIncidentSeveritySchema,
	operationsIncidentStatusSchema,
	operationsRunbookIdSchema,
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

export const transitionIncidentStatusCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	incidentId: operationsIncidentIdSchema,
	expectedRevision: z.number().int().positive(),
	targetStatus: operationsIncidentStatusSchema,
	reason: z.string().max(1024).optional(),
});

export const attachIncidentRunbookCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	incidentId: operationsIncidentIdSchema,
	expectedRevision: z.number().int().positive(),
	runbookId: operationsRunbookIdSchema,
	runbookVersion: z.string().min(1).max(64),
	responsiblePrincipalId: z.string().uuid().optional(),
	evidence: z.string().max(4096).optional(),
});

export type TransitionIncidentStatusCommand = z.infer<
	typeof transitionIncidentStatusCommandSchema
>;
export type AttachIncidentRunbookCommand = z.infer<
	typeof attachIncidentRunbookCommandSchema
>;

