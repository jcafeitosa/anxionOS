import type { z } from "zod";
import { backtestRequestedPayloadSchema } from "../strategies/events";
import type { CreateSimulationRunCommand } from "./commands";
import {
	assertSimulationExecutionModeSupported,
	simulationExecutionModeSchema,
} from "./types";

/** Bridge schema for simulation consumer input shaped as strategies.backtest.requested.v1. */
export const strategiesBacktestRequestedBridgeSchema =
	backtestRequestedPayloadSchema;

export function mapBacktestRequestedToSimulationInput(
	backtest: StrategiesBacktestRequestedBridge,
	commandId: string,
): CreateSimulationRunCommand {
	const parsed = strategiesBacktestRequestedBridgeSchema.parse(backtest);
	assertSimulationExecutionModeSupported(parsed.executionMode);
	const executionMode = simulationExecutionModeSchema.parse(
		parsed.executionMode,
	);
	return {
		commandId,
		organizationId: parsed.organizationId,
		strategyId: parsed.strategyId,
		strategyVersionId: parsed.strategyVersionId,
		backtestRequestId: parsed.backtestRequestId,
		executionMode,
		isolationFlags: {
			sandboxIsolated: true,
			promotionBlocked: true,
			syntheticCredentialsOnly: true,
			isolatedSubgraph: true,
		},
		manifest: {
			datasetId: parsed.datasetId,
			datasetRevision: parsed.datasetRevision,
			seed: parsed.seed,
			requestedAt: parsed.requestedAt,
		},
	};
}

export type StrategiesBacktestRequestedBridge = z.infer<
	typeof strategiesBacktestRequestedBridgeSchema
>;
export type CreateSimulationRunFromBacktestInput = CreateSimulationRunCommand;
