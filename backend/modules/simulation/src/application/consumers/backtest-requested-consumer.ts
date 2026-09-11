import type {
	SimulationCommandResult,
	StrategiesBacktestRequestedBridge,
} from "@anxionos/contracts/simulation";
import { mapBacktestRequestedToSimulationInput } from "@anxionos/contracts/simulation";
import {
	type CreateSimulationRunDeps,
	createSimulationRun,
} from "../commands/create-simulation-run";

export interface BacktestRequestedConsumerDeps
	extends CreateSimulationRunDeps {}

export function createBacktestRequestedConsumer(
	deps: BacktestRequestedConsumerDeps,
): {
	handle(
		backtest: StrategiesBacktestRequestedBridge,
		eventId: string,
	): Promise<SimulationCommandResult>;
} {
	return {
		async handle(backtest, eventId) {
			const command = mapBacktestRequestedToSimulationInput(backtest, eventId);
			return createSimulationRun(deps, command);
		},
	};
}
