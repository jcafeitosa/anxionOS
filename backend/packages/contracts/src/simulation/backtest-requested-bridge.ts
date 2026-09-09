import { z } from "zod";
import { simulationBacktestRequestIdSchema } from "./types";
/** Bridge schema for simulation consumer input shaped as strategies.backtest.requested.v1. */
export const strategiesBacktestRequestedBridgeSchema = z.object({
    backtestRequestId: simulationBacktestRequestIdSchema,
    organizationId: z.string().uuid(),
    strategyId: z.string().min(1).max(128),
    strategyVersionId: z.string().min(1).max(128),
    executionMode: z.enum(["SIMULATED"]),
    scenarioLabel: z.string().min(1).max(256).optional(),
    requestedAt: z.string().datetime(),
});
export function mapBacktestRequestedToSimulationInput(backtest: StrategiesBacktestRequestedBridge, commandId: string): CreateSimulationRunFromBacktestInput {
    const parsed = strategiesBacktestRequestedBridgeSchema.parse(backtest);
    return {
        commandId,
        organizationId: parsed.organizationId,
        strategyId: parsed.strategyId,
        strategyVersionId: parsed.strategyVersionId,
        backtestRequestId: parsed.backtestRequestId,
        executionMode: parsed.executionMode,
        scenarioLabel: parsed.scenarioLabel,
    };
}

export type StrategiesBacktestRequestedBridge = z.infer<typeof strategiesBacktestRequestedBridgeSchema>;
export interface CreateSimulationRunFromBacktestInput {
    commandId: string;
    organizationId: string;
    strategyId: string;
    strategyVersionId: string;
    backtestRequestId: string;
    executionMode: "SIMULATED";
    scenarioLabel?: string;
}
