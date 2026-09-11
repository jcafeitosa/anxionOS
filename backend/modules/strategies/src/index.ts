export {
	registerStrategy,
	type RegisterStrategyDeps,
} from "./application/commands/register-strategy";
export {
	createStrategyVersion,
	type CreateStrategyVersionDeps,
} from "./application/commands/create-strategy-version";
export {
	publishStrategyVersion,
	type PublishStrategyVersionDeps,
} from "./application/commands/publish-strategy-version";
export {
	requestBacktest,
	type RequestBacktestDeps,
} from "./application/commands/request-backtest";
export {
	completeBacktest,
	type CompleteBacktestDeps,
} from "./application/commands/complete-backtest";
export {
	activateDeployment,
	type ActivateDeploymentDeps,
} from "./application/commands/activate-deployment";
export {
	emitSignal,
	type EmitSignalDeps,
} from "./application/commands/emit-signal";
export {
	promoteStrategyVersionCertified,
	type PromoteStrategyVersionCertifiedDeps,
} from "./application/commands/promote-strategy-version-certified";
export { createCertificationIssuedConsumer } from "./application/consumers/certification-issued-consumer";
export type { EvaluationCertificationConsumerPort } from "./domain/ports/evaluation-certification-consumer-port";
export { createSandboxBacktestRunnerAdapter } from "./infrastructure/adapters/sandbox-backtest-runner-adapter";
export {
	StrategiesCommandError,
	throwStrategiesError,
} from "./application/errors";
export {
	rollbackDeployment,
	type RollbackDeploymentDeps,
} from "./application/commands/rollback-deployment";

export { ensureStrategiesSchema } from "./infrastructure/migrate";
export { createStrategiesUnitOfWork } from "./infrastructure/strategies-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
