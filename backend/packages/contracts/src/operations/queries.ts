import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	operationsIncidentIdSchema,
	operationsIncidentSeveritySchema,
	operationsIncidentStatusSchema,
	operationsRecoveryStepKindSchema,
	operationsRecoveryTaskIdSchema,
	operationsRecoveryTaskStatusSchema,
	operationsRunbookIdSchema,
} from "./types";

export const incidentSnapshotSchema = z.object({
	incidentId: operationsIncidentIdSchema,
	organizationId: institutionalUuidSchema,
	title: z.string().min(1).max(256),
	description: z.string().max(4096).nullable(),
	severity: operationsIncidentSeveritySchema,
	status: operationsIncidentStatusSchema,
	serviceId: z.string().min(1).max(128).nullable(),
	openedAt: z.string().datetime(),
	revision: z.number().int().positive(),
	runbookId: operationsRunbookIdSchema.nullable(),
	runbookVersion: z.string().min(1).max(64).nullable(),
	runbookAttachedAt: z.string().datetime().nullable(),
	responsiblePrincipalId: institutionalUuidSchema.nullable(),
	resolvedAt: z.string().datetime().nullable(),
	closedAt: z.string().datetime().nullable(),
});

export const listIncidentsResponseSchema = z.object({
	incidents: z.array(incidentSnapshotSchema),
});

export type IncidentSnapshot = z.infer<typeof incidentSnapshotSchema>;
export type ListIncidentsResponse = z.infer<typeof listIncidentsResponseSchema>;

export const recoveryTaskSnapshotSchema = z.object({
	recoveryTaskId: operationsRecoveryTaskIdSchema,
	organizationId: institutionalUuidSchema,
	incidentId: operationsIncidentIdSchema,
	stepKind: operationsRecoveryStepKindSchema,
	status: operationsRecoveryTaskStatusSchema,
	stepRequiresApproval: z.boolean(),
	hasRequiredApproval: z.boolean(),
	startedAt: z.string().datetime(),
	revision: z.number().int().positive(),
	initiatedByPrincipalId: institutionalUuidSchema.nullable(),
});

export const listRecoveryTasksByIncidentResponseSchema = z.object({
	recoveryTasks: z.array(recoveryTaskSnapshotSchema),
});

export type RecoveryTaskSnapshot = z.infer<typeof recoveryTaskSnapshotSchema>;
export type ListRecoveryTasksByIncidentResponse = z.infer<
	typeof listRecoveryTasksByIncidentResponseSchema
>;
