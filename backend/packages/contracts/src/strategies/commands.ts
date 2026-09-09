import { z } from "zod";
import { strategiesExecutionModeSchema, strategyIdSchema, strategyVersionIdSchema, } from "./types";
const contentHashSchema = z.string().regex(/^[a-f0-9]{64}$/i);
export const strategiesCommandResultSchema = z.object({
    aggregateId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    idempotentReplay: z.boolean().optional(),
    strategyId: strategyIdSchema.optional(),
    strategyVersionId: strategyVersionIdSchema.optional(),
});
export const registerStrategyCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    displayName: z.string().min(1).max(256),
    description: z.string().max(1024).optional(),
    executionMode: strategiesExecutionModeSchema,
});
export const createStrategyVersionCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    strategyId: strategyIdSchema,
    sourceHash: contentHashSchema,
    rulesHash: contentHashSchema,
    parametersHash: contentHashSchema,
    executionMode: strategiesExecutionModeSchema,
});
export const publishStrategyVersionCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    strategyId: strategyIdSchema,
    strategyVersionId: strategyVersionIdSchema,
});

export type StrategiesCommandResult = z.infer<typeof strategiesCommandResultSchema>;

export type RegisterStrategyCommand = z.infer<typeof registerStrategyCommandSchema>;

export type CreateStrategyVersionCommand = z.infer<typeof createStrategyVersionCommandSchema>;

export type PublishStrategyVersionCommand = z.infer<typeof publishStrategyVersionCommandSchema>;
