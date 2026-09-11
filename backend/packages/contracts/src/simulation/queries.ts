import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	sandboxIsolationFlagsSchema,
	simulationBacktestRequestIdSchema,
	simulationExecutionModeSchema,
	simulationRunIdSchema,
	simulationRunStatusSchema,
} from "./types";

export const simulationRunSchema = z.object({
	simulationRunId: simulationRunIdSchema,
	organizationId: institutionalUuidSchema,
	manifestId: z.string().nullable(),
	strategyId: z.string().nullable(),
	strategyVersionId: z.string().nullable(),
	backtestRequestId: simulationBacktestRequestIdSchema.nullable(),
	executionMode: simulationExecutionModeSchema,
	status: simulationRunStatusSchema,
	scenarioLabel: z.string().nullable(),
	isolationFlags: sandboxIsolationFlagsSchema,
	seedHash: z.string().nullable(),
	resultRef: z.string().nullable(),
	revision: z.number().int().nonnegative(),
	startedAt: z.string().datetime(),
	completedAt: z.string().datetime().nullable(),
	failedAt: z.string().datetime().nullable(),
	failureCode: z.string().nullable(),
});

export const listSimulationRunsResponseSchema = z.object({
	simulationRuns: z.array(simulationRunSchema),
});

export const simulationRunSnapshotSchema = z.object({
	snapshotId: z.string().regex(/^sim_snap_[0-9a-f-]{36}$/i),
	simulationRunId: simulationRunIdSchema,
	organizationId: institutionalUuidSchema,
	datasetRef: z.string().nullable(),
	datasetHash: z.string().min(1),
	snapshotPayload: z.record(z.string(), z.unknown()).nullable(),
});

export const listSimulationRunsQuerySchema = z.object({
	status: simulationRunStatusSchema.optional(),
	backtestRequestId: simulationBacktestRequestIdSchema.optional(),
	strategyId: z.string().min(1).max(128).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type SimulationRun = z.infer<typeof simulationRunSchema>;
export type ListSimulationRunsResponse = z.infer<
	typeof listSimulationRunsResponseSchema
>;
export type SimulationRunSnapshot = z.infer<typeof simulationRunSnapshotSchema>;
