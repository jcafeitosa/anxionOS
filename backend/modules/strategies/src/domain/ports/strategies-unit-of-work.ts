import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";

export type StrategiesExecutionMode = "SIMULATED" | "PAPER";
export type StrategyStatus = "ACTIVE" | "ARCHIVED";
export type StrategyVersionLifecycle =
	| "DRAFT"
	| "BACKTESTED"
	| "EVALUATED"
	| "CERTIFIED"
	| "PAPER"
	| "SUSPENDED"
	| "RETIRED";
export type BacktestRunStatus =
	| "REQUESTED"
	| "RUNNING"
	| "COMPLETED"
	| "FAILED"
	| "CANCELLED";
export type DeploymentStatus = "ACTIVE" | "PAUSED" | "ROLLED_BACK" | "RETIRED";

export interface BindingSnapshot {
	instrumentRefs: string[];
	parametersHash: string;
	rulesHash?: string;
}

export interface StrategyRecord {
	id: string;
	organizationId: string;
	displayName: string;
	description: string | null;
	executionMode: StrategiesExecutionMode;
	status: StrategyStatus;
	revision: number;
}
export interface StrategyVersionRecord {
	id: string;
	strategyId: string;
	organizationId: string;
	versionNumber: number;
	sourceHash: string;
	rulesHash: string;
	parametersHash: string;
	lifecycleState: StrategyVersionLifecycle;
	executionMode: StrategiesExecutionMode;
	revision: number;
	publishedAt: string | null;
}
export interface StrategyRepository {
	findById(
		strategyId: string,
		organizationId: string,
	): Promise<StrategyRecord | null>;
	findActiveByNaturalKey(
		organizationId: string,
		displayName: string,
	): Promise<StrategyRecord | null>;
	save(record: StrategyRecord): Promise<StrategyRecord>;
	update(record: StrategyRecord): Promise<StrategyRecord>;
}
export interface StrategyVersionRepository {
	findById(
		versionId: string,
		organizationId: string,
	): Promise<StrategyVersionRecord | null>;
	countByStrategy(strategyId: string): Promise<number>;
	save(record: StrategyVersionRecord): Promise<StrategyVersionRecord>;
	update(record: StrategyVersionRecord): Promise<StrategyVersionRecord>;
}
export interface BacktestRunRecord {
	id: string;
	organizationId: string;
	strategyId: string;
	strategyVersionId: string;
	datasetId: string;
	datasetRevision: string;
	seed: string;
	status: BacktestRunStatus;
	resultRef: string | null;
	metricsHash: string | null;
}
export interface BacktestRunRepository {
	findById(
		backtestRunId: string,
		organizationId: string,
	): Promise<BacktestRunRecord | null>;
	save(record: BacktestRunRecord): Promise<BacktestRunRecord>;
	update(record: BacktestRunRecord): Promise<BacktestRunRecord>;
}
export interface DeploymentRecord {
	id: string;
	organizationId: string;
	strategyId: string;
	strategyVersionId: string;
	executionMode: StrategiesExecutionMode;
	portfolioId: string | null;
	bindingSnapshot: BindingSnapshot;
	status: DeploymentStatus;
	revision: number;
}
export interface DeploymentRepository {
	findById(
		deploymentId: string,
		organizationId: string,
	): Promise<DeploymentRecord | null>;
	save(record: DeploymentRecord): Promise<DeploymentRecord>;
	updateStatus(record: DeploymentRecord): Promise<DeploymentRecord>;
}
export interface SignalRecord {
	id: string;
	organizationId: string;
	strategyId: string;
	deploymentId: string | null;
	instrumentRefs: string[];
	valueRef: string;
	expiresAt: string;
	revision: number;
}
export interface SignalRepository {
	save(record: SignalRecord): Promise<SignalRecord>;
}
export interface StrategiesTransactionContext {
	commandJournal: CommandJournalRepository;
	strategies: StrategyRepository;
	versions: StrategyVersionRepository;
	backtestRuns: BacktestRunRepository;
	deployments: DeploymentRepository;
	signals: SignalRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface StrategiesUnitOfWork {
	runInTransaction<T>(
		work: (ctx: StrategiesTransactionContext) => Promise<T>,
	): Promise<T>;
}
