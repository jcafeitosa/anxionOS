export {
	SimulationCommandError,
	throwSimulationError,
	parseCommandResultSnapshot,
} from "./application/errors";
export {
	createSimulationRun,
	type CreateSimulationRunDeps,
} from "./application/commands/create-simulation-run";
export {
	executeSimulationRun,
	type ExecuteSimulationRunDeps,
} from "./application/commands/execute-simulation-run";
export { createBacktestRequestedConsumer } from "./application/consumers/backtest-requested-consumer";
export { createRunStartedConsumer } from "./application/consumers/run-started-consumer";
export {
	getSimulationRun,
	type GetSimulationRunDeps,
} from "./application/queries/get-simulation-run";
export {
	getSimulationRunSnapshot,
	type GetSimulationRunSnapshotDeps,
} from "./application/queries/get-simulation-run-snapshot";
export {
	listSimulationRuns,
	type ListSimulationRunsDeps,
} from "./application/queries/list-simulation-runs";
export {
	computeFixtureDatasetHash,
	resolveDatasetHash,
	DEFAULT_DATASET_HASH,
} from "./application/dataset-hash-support";
export type {
	SimulationSandboxInput,
	SimulationSandboxPort,
	SimulationSandboxResult,
} from "./domain/ports/simulation-sandbox-port";
export type {
	SimulationResultStoreInput,
	SimulationResultStorePort,
} from "./domain/ports/simulation-result-store-port";
export { createSqliteSimulationSandboxAdapter } from "./infrastructure/adapters/sqlite-simulation-sandbox-adapter";
export { createFilesystemSimulationResultStoreAdapter } from "./infrastructure/adapters/filesystem-simulation-result-store-adapter";
export {
	createDefaultSimulationResultStore,
	createDefaultSimulationSandbox,
	resolveSimulationSandboxRoot,
} from "./infrastructure/simulation-runtime";
export {
	SIMULATION_OWNER_DOMAIN,
	SimulationContractError,
	createSimulationRunCommandSchema,
	simulationCommandResultSchema,
	type SimulationCommandResult,
	type CreateSimulationRunCommand,
} from "@anxionos/contracts/simulation";
export { ensureSimulationSchema } from "./infrastructure/migrate";
export { createSimulationDb } from "./infrastructure/create-db";
export { createSimulationUnitOfWork } from "./infrastructure/simulation-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
