import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	sandboxIsolationFlagsSchema,
	simulationBacktestRequestIdSchema,
	simulationExecutionModeSchema,
	simulationRunIdSchema,
	simulationRunStatusSchema,
} from "./types";
export const SIMULATION_EVENT_TYPES = {
	RUN_STARTED: "simulation.run.started.v1",
	RUN_COMPLETED: "simulation.run.completed.v1",
	RUN_FAILED: "simulation.run.failed.v1",
	SNAPSHOT_CREATED: "simulation.snapshot.created.v1",
};
export const runStartedPayloadSchema = z.object({
	simulationRunId: simulationRunIdSchema,
	organizationId: institutionalUuidSchema,
	strategyId: z.string().optional(),
	strategyVersionId: z.string().optional(),
	backtestRequestId: simulationBacktestRequestIdSchema.optional(),
	executionMode: simulationExecutionModeSchema,
	status: simulationRunStatusSchema,
	isolationFlags: sandboxIsolationFlagsSchema,
	scenarioLabel: z.string().optional(),
	startedAt: z.string().datetime(),
});
export const runCompletedPayloadSchema = z.object({
	schemaVersion: z.literal("1.0.0"),
	simulationRunId: simulationRunIdSchema,
	organizationId: institutionalUuidSchema,
	resultRef: z.string().min(1),
	datasetHash: z.string().min(1),
	snapshotId: z.string().min(1),
	completedAt: z.string().datetime(),
});
export const runFailedPayloadSchema = z.object({
	simulationRunId: simulationRunIdSchema,
	organizationId: institutionalUuidSchema,
	failureCode: z.string().min(1),
	failedAt: z.string().datetime(),
});
export const snapshotCreatedPayloadSchema = z.object({
	simulationRunId: simulationRunIdSchema,
	organizationId: institutionalUuidSchema,
	snapshotId: z.string().min(1),
	createdAt: z.string().datetime(),
});
export const simulationEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(SIMULATION_EVENT_TYPES.RUN_STARTED),
		payload: runStartedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(SIMULATION_EVENT_TYPES.RUN_COMPLETED),
		payload: runCompletedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(SIMULATION_EVENT_TYPES.RUN_FAILED),
		payload: runFailedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(SIMULATION_EVENT_TYPES.SNAPSHOT_CREATED),
		payload: snapshotCreatedPayloadSchema,
	}),
]);

export type SimulationEventType =
	(typeof SIMULATION_EVENT_TYPES)[keyof typeof SIMULATION_EVENT_TYPES];
