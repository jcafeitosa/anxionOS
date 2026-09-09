import { z } from "zod";
export const OPERATIONS_OWNER_DOMAIN = "operations";
export const operationsHealthCheckIdSchema = z.string().regex(/^ops_hlt_[0-9a-f-]{36}$/i);
export const operationsIncidentIdSchema = z.string().regex(/^ops_inc_[0-9a-f-]{36}$/i);
export const operationsHealthStatusSchema = z.enum(["HEALTHY", "DEGRADED", "UNHEALTHY"]);
export const operationsIncidentSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const operationsIncidentStatusSchema = z.enum(["OPEN", "RESOLVED", "CLOSED"]);

export type OperationsHealthCheckId = z.infer<typeof operationsHealthCheckIdSchema>;
export type OperationsIncidentId = z.infer<typeof operationsIncidentIdSchema>;
export type OperationsHealthStatus = z.infer<typeof operationsHealthStatusSchema>;
export type OperationsIncidentSeverity = z.infer<typeof operationsIncidentSeveritySchema>;
export type OperationsIncidentStatus = z.infer<typeof operationsIncidentStatusSchema>;
