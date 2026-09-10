import { z } from "zod";
import {
	operationsHealthCheckIdSchema,
	operationsHealthStatusSchema,
	operationsIncidentIdSchema,
	operationsIncidentSeveritySchema,
	operationsIncidentStatusSchema,
	operationsRunbookIdSchema,
} from "./types";
export const OPERATIONS_EVENT_TYPES = {
	INCIDENT_OPENED: "operations.incident.opened.v1",
	INCIDENT_STATUS_CHANGED: "operations.incident.status.changed.v1",
	INCIDENT_RUNBOOK_ATTACHED: "operations.incident.runbook.attached.v1",
	HEALTH_DEGRADED: "operations.health.degraded.v1",
};
export const incidentOpenedPayloadSchema = z.object({
	incidentId: operationsIncidentIdSchema,
	organizationId: z.string().uuid(),
	title: z.string().min(1),
	description: z.string().optional(),
	severity: operationsIncidentSeveritySchema,
	serviceId: z.string().optional(),
	openedAt: z.string().datetime(),
});
export const incidentStatusChangedPayloadSchema = z.object({
	incidentId: operationsIncidentIdSchema,
	organizationId: z.string().uuid(),
	fromStatus: operationsIncidentStatusSchema,
	toStatus: operationsIncidentStatusSchema,
	revision: z.number().int().positive(),
	reason: z.string().optional(),
	changedAt: z.string().datetime(),
});
export const incidentRunbookAttachedPayloadSchema = z.object({
	incidentId: operationsIncidentIdSchema,
	organizationId: z.string().uuid(),
	runbookId: operationsRunbookIdSchema,
	runbookVersion: z.string().min(1).max(64),
	responsiblePrincipalId: z.string().uuid().optional(),
	evidence: z.string().optional(),
	attachedAt: z.string().datetime(),
	revision: z.number().int().positive(),
});
export const healthDegradedPayloadSchema = z.object({
	healthCheckId: operationsHealthCheckIdSchema,
	organizationId: z.string().uuid(),
	serviceId: z.string().min(1),
	status: operationsHealthStatusSchema,
	checkedAt: z.string().datetime(),
});
export const operationsEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.INCIDENT_OPENED),
		payload: incidentOpenedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.INCIDENT_STATUS_CHANGED),
		payload: incidentStatusChangedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.INCIDENT_RUNBOOK_ATTACHED),
		payload: incidentRunbookAttachedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(OPERATIONS_EVENT_TYPES.HEALTH_DEGRADED),
		payload: healthDegradedPayloadSchema,
	}),
]);

export type OperationsEventType =
	(typeof OPERATIONS_EVENT_TYPES)[keyof typeof OPERATIONS_EVENT_TYPES];
