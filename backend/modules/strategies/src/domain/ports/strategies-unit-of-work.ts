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
export interface StrategiesTransactionContext {
	commandJournal: CommandJournalRepository;
	strategies: StrategyRepository;
	versions: StrategyVersionRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface StrategiesUnitOfWork {
	runInTransaction<T>(
		work: (ctx: StrategiesTransactionContext) => Promise<T>,
	): Promise<T>;
}
