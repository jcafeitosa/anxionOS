import { z } from "zod";
import { operationsHealthCheckIdSchema, operationsHealthStatusSchema, operationsIncidentIdSchema, operationsIncidentSeveritySchema, } from "./types";
export const OPERATIONS_EVENT_TYPES = {
    INCIDENT_OPENED: "operations.incident.opened.v1",
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
        eventType: z.literal(OPERATIONS_EVENT_TYPES.HEALTH_DEGRADED),
        payload: healthDegradedPayloadSchema,
    }),
]);

export type OperationsEventType = (typeof OPERATIONS_EVENT_TYPES)[keyof typeof OPERATIONS_EVENT_TYPES];
