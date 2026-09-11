export {
	type CreateSimulationRunCommand,
	createSimulationRunCommandSchema,
	SIMULATION_OWNER_DOMAIN,
	type SimulationCommandResult,
	SimulationContractError,
	simulationCommandResultSchema,
} from "@anxionos/contracts/simulation";
export {
	type CreateSimulationRunDeps,
	createSimulationRun,
} from "./application/commands/create-simulation-run";
export {
	type ExecuteSimulationRunDeps,
	executeSimulationRun,
} from "./application/commands/execute-simulation-run";
export { createBacktestRequestedConsumer } from "./application/consumers/backtest-requested-consumer";
export { createRunStartedConsumer } from "./application/consumers/run-started-consumer";
export {
	computeFixtureDatasetHash,
	DEFAULT_DATASET_HASH,
	resolveDatasetHash,
} from "./application/dataset-hash-support";
export {
	parseCommandResultSnapshot,
	SimulationCommandError,
	throwSimulationError,
} from "./application/errors";
export {
	type GetSimulationRunDeps,
	getSimulationRun,
} from "./application/queries/get-simulation-run";
export {
	type GetSimulationRunSnapshotDeps,
	getSimulationRunSnapshot,
} from "./application/queries/get-simulation-run-snapshot";
export {
	type ListSimulationRunsDeps,
	listSimulationRuns,
} from "./application/queries/list-simulation-runs";
export type {
	SimulationResultStoreInput,
	SimulationResultStorePort,
} from "./domain/ports/simulation-result-store-port";
export type {
	SimulationSandboxInput,
	SimulationSandboxPort,
	SimulationSandboxResult,
} from "./domain/ports/simulation-sandbox-port";
export { createFilesystemSimulationResultStoreAdapter } from "./infrastructure/adapters/filesystem-simulation-result-store-adapter";
export { createSqliteSimulationSandboxAdapter } from "./infrastructure/adapters/sqlite-simulation-sandbox-adapter";
export { createSimulationDb } from "./infrastructure/create-db";
export { ensureSimulationSchema } from "./infrastructure/migrate";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
export {
	createDefaultSimulationResultStore,
	createDefaultSimulationSandbox,
	resolveSimulationSandboxRoot,
} from "./infrastructure/simulation-runtime";
export { createSimulationUnitOfWork } from "./infrastructure/simulation-unit-of-work";
