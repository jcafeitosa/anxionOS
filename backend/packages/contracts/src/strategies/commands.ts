import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	assertStrategiesExecutionModeSupported,
	bindingSnapshotSchema,
	backtestRunIdSchema,
	deploymentIdSchema,
	signalIdSchema,
	strategiesExecutionModeSchema,
	strategyIdSchema,
	strategyVersionIdSchema,
} from "./types";
const contentHashSchema = z.string().regex(/^[a-f0-9]{64}$/i);
export const strategiesCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	strategyId: strategyIdSchema.optional(),
	strategyVersionId: strategyVersionIdSchema.optional(),
	backtestRunId: backtestRunIdSchema.optional(),
	deploymentId: deploymentIdSchema.optional(),
	signalId: signalIdSchema.optional(),
});
export const registerStrategyCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	displayName: z.string().min(1).max(256),
	description: z.string().max(1024).optional(),
	executionMode: strategiesExecutionModeSchema,
});
export const createStrategyVersionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	strategyId: strategyIdSchema,
	sourceHash: contentHashSchema,
	rulesHash: contentHashSchema,
	parametersHash: contentHashSchema,
	executionMode: strategiesExecutionModeSchema,
});
export const publishStrategyVersionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
});
export const requestBacktestCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
	datasetId: z.string().min(1).max(256),
	datasetRevision: z.string().min(1).max(128),
	seed: z.string().min(1).max(256),
});
export const completeBacktestCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	backtestRunId: backtestRunIdSchema,
});
const activateDeploymentExecutionModeSchema = z
	.string()
	.superRefine((value, ctx) => {
		try {
			assertStrategiesExecutionModeSupported(value);
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "ST_EXECUTION_MODE_NOT_SUPPORTED",
			});
		}
	})
	.pipe(strategiesExecutionModeSchema);
export const activateDeploymentCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
	executionMode: activateDeploymentExecutionModeSchema,
	portfolioId: z.string().min(1).max(256).optional(),
	bindingSnapshot: bindingSnapshotSchema,
});
export const emitSignalCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	strategyId: strategyIdSchema,
	deploymentId: deploymentIdSchema.optional(),
	instrumentRefs: z.array(z.string().min(1)).min(1),
	valueRef: z.string().min(1).max(512),
	expiresAt: z.string().datetime(),
});

export type StrategiesCommandResult = z.infer<
	typeof strategiesCommandResultSchema
>;

export type RegisterStrategyCommand = z.infer<
	typeof registerStrategyCommandSchema
>;

export type CreateStrategyVersionCommand = z.infer<
	typeof createStrategyVersionCommandSchema
>;

export type PublishStrategyVersionCommand = z.infer<
	typeof publishStrategyVersionCommandSchema
>;

export type RequestBacktestCommand = z.infer<
	typeof requestBacktestCommandSchema
>;

export type CompleteBacktestCommand = z.infer<
	typeof completeBacktestCommandSchema
>;

export type ActivateDeploymentCommand = z.infer<
	typeof activateDeploymentCommandSchema
>;

export type EmitSignalCommand = z.infer<typeof emitSignalCommandSchema>;

/** ANX-171 — rollback a deployment to its previous version (audited). */
export const rollbackDeploymentCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	deploymentId: deploymentIdSchema,
	reason: z.string().min(1).max(512),
	rolledBackBy: institutionalUuidSchema,
});
export type RollbackDeploymentCommand = z.infer<
	typeof rollbackDeploymentCommandSchema
>;

