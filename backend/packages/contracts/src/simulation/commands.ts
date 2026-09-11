import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	sandboxIsolationFlagsSchema,
	simulationBacktestRequestIdSchema,
	simulationExecutionModeSchema,
	simulationRunIdSchema,
} from "./types";
export const simulationCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	simulationRunId: simulationRunIdSchema.optional(),
});
export const createSimulationRunCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	strategyId: z.string().min(1).max(128).optional(),
	strategyVersionId: z.string().min(1).max(128).optional(),
	backtestRequestId: simulationBacktestRequestIdSchema.optional(),
	executionMode: simulationExecutionModeSchema.default("SIMULATED"),
	scenarioLabel: z.string().min(1).max(256).optional(),
	manifest: z.record(z.string(), z.unknown()).optional(),
	isolationFlags: sandboxIsolationFlagsSchema.default({
		sandboxIsolated: true,
		promotionBlocked: true,
		syntheticCredentialsOnly: true,
		isolatedSubgraph: true,
	}),
});

export type SimulationCommandResult = z.infer<
	typeof simulationCommandResultSchema
>;

export type CreateSimulationRunCommand = z.infer<
	typeof createSimulationRunCommandSchema
>;

export const executeSimulationRunCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	simulationRunId: simulationRunIdSchema,
});

export type ExecuteSimulationRunCommand = z.infer<
	typeof executeSimulationRunCommandSchema
>;
