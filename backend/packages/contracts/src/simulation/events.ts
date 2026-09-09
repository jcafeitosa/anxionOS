import { z } from "zod";
import { sandboxIsolationFlagsSchema, simulationBacktestRequestIdSchema, simulationExecutionModeSchema, simulationRunIdSchema, simulationRunStatusSchema, } from "./types";
export const SIMULATION_EVENT_TYPES = {
    RUN_STARTED: "simulation.run.started.v1",
    RUN_COMPLETED: "simulation.run.completed.v1",
    SNAPSHOT_CREATED: "simulation.snapshot.created.v1",
};
export const runStartedPayloadSchema = z.object({
    simulationRunId: simulationRunIdSchema,
    organizationId: z.string().uuid(),
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
    simulationRunId: simulationRunIdSchema,
    organizationId: z.string().uuid(),
    completedAt: z.string().datetime(),
});
export const snapshotCreatedPayloadSchema = z.object({
    simulationRunId: simulationRunIdSchema,
    organizationId: z.string().uuid(),
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
        eventType: z.literal(SIMULATION_EVENT_TYPES.SNAPSHOT_CREATED),
        payload: snapshotCreatedPayloadSchema,
    }),
]);

export type SimulationEventType = (typeof SIMULATION_EVENT_TYPES)[keyof typeof SIMULATION_EVENT_TYPES];
