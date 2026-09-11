export {
	type ActivateDeploymentDeps,
	activateDeployment,
} from "./application/commands/activate-deployment";
export {
	type CompleteBacktestDeps,
	completeBacktest,
} from "./application/commands/complete-backtest";
export {
	type CreateStrategyVersionDeps,
	createStrategyVersion,
} from "./application/commands/create-strategy-version";
export {
	type EmitSignalDeps,
	emitSignal,
} from "./application/commands/emit-signal";
export {
	type PromoteStrategyVersionCertifiedDeps,
	promoteStrategyVersionCertified,
} from "./application/commands/promote-strategy-version-certified";
export {
	type PublishStrategyVersionDeps,
	publishStrategyVersion,
} from "./application/commands/publish-strategy-version";
export {
	type RegisterStrategyDeps,
	registerStrategy,
} from "./application/commands/register-strategy";
export {
	type RequestBacktestDeps,
	requestBacktest,
} from "./application/commands/request-backtest";
export {
	type RollbackDeploymentDeps,
	rollbackDeployment,
} from "./application/commands/rollback-deployment";
export { createCertificationIssuedConsumer } from "./application/consumers/certification-issued-consumer";
export {
	StrategiesCommandError,
	throwStrategiesError,
} from "./application/errors";
export type { EvaluationCertificationConsumerPort } from "./domain/ports/evaluation-certification-consumer-port";
export { createSandboxBacktestRunnerAdapter } from "./infrastructure/adapters/sandbox-backtest-runner-adapter";

export { ensureStrategiesSchema } from "./infrastructure/migrate";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
export { createStrategiesUnitOfWork } from "./infrastructure/strategies-unit-of-work";
