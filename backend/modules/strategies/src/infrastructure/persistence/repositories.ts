import type { PoolClient } from "pg";
import type {
	BacktestRunRecord,
	BacktestRunRepository,
	BacktestRunStatus,
	BindingSnapshot,
	DeploymentRecord,
	DeploymentRepository,
	DeploymentStatus,
	SignalRecord,
	SignalRepository,
	StrategiesExecutionMode,
	StrategyRecord,
	StrategyRepository,
	StrategyStatus,
	StrategyVersionLifecycle,
	StrategyVersionRecord,
	StrategyVersionRepository,
} from "../../domain/ports/strategies-unit-of-work";

type StrategyRow = {
	id: string;
	organization_id: string;
	display_name: string;
	description: string | null;
	execution_mode: string;
	status: string;
	revision: number;
};

type BacktestRunRow = {
	id: string;
	organization_id: string;
	strategy_id: string;
	strategy_version_id: string;
	dataset_id: string;
	dataset_revision: string;
	seed: string;
	status: string;
	result_ref: string | null;
	metrics_hash: string | null;
};

type StrategyVersionRow = {
	id: string;
	strategy_id: string;
	organization_id: string;
	version_number: number;
	source_hash: string;
	rules_hash: string;
	parameters_hash: string;
	lifecycle_state: string;
	execution_mode: string;
	revision: number;
	published_at: string | Date | null;
};

function mapStrategy(row: StrategyRow): StrategyRecord {
	return {
		id: row.id,
		organizationId: row.organization_id,
		displayName: row.display_name,
		description: row.description ?? null,
		executionMode: row.execution_mode as StrategiesExecutionMode,
		status: row.status as StrategyStatus,
		revision: row.revision,
	};
}
function mapBacktestRun(row: BacktestRunRow): BacktestRunRecord {
	return {
		id: row.id,
		organizationId: row.organization_id,
		strategyId: row.strategy_id,
		strategyVersionId: row.strategy_version_id,
		datasetId: row.dataset_id,
		datasetRevision: row.dataset_revision,
		seed: row.seed,
		status: row.status as BacktestRunStatus,
		resultRef: row.result_ref,
		metricsHash: row.metrics_hash,
	};
}
function mapVersion(row: StrategyVersionRow): StrategyVersionRecord {
	return {
		id: row.id,
		strategyId: row.strategy_id,
		organizationId: row.organization_id,
		versionNumber: row.version_number,
		sourceHash: row.source_hash,
		rulesHash: row.rules_hash,
		parametersHash: row.parameters_hash,
		lifecycleState: row.lifecycle_state as StrategyVersionLifecycle,
		executionMode: row.execution_mode as StrategiesExecutionMode,
		revision: row.revision,
		publishedAt: row.published_at ? String(row.published_at) : null,
	};
}
export function createPgStrategyRepository(
	client: PoolClient,
): StrategyRepository {
	return {
		async findById(strategyId, organizationId) {
			const result = await client.query(
				"SELECT * FROM strategies WHERE id = $1 AND organization_id = $2",
				[strategyId, organizationId],
			);
			const row = result.rows[0];
			return row ? mapStrategy(row) : null;
		},
		async findActiveByNaturalKey(organizationId, displayName) {
			const result = await client.query(
				`SELECT * FROM strategies WHERE organization_id = $1 AND display_name = $2 AND status = 'ACTIVE'`,
				[organizationId, displayName],
			);
			const row = result.rows[0];
			return row ? mapStrategy(row) : null;
		},
		async save(record) {
			await client.query(
				`INSERT INTO strategies (id, organization_id, display_name, description, execution_mode, status, revision)
				 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					record.id,
					record.organizationId,
					record.displayName,
					record.description,
					record.executionMode,
					record.status,
					record.revision,
				],
			);
			return record;
		},
		async update(record) {
			await client.query(
				`UPDATE strategies SET revision = $3, updated_at = now()
				 WHERE id = $1 AND organization_id = $2`,
				[record.id, record.organizationId, record.revision],
			);
			return record;
		},
	};
}
export function createPgStrategyVersionRepository(
	client: PoolClient,
): StrategyVersionRepository {
	return {
		async findById(versionId, organizationId) {
			const result = await client.query(
				"SELECT * FROM strategy_versions WHERE id = $1 AND organization_id = $2",
				[versionId, organizationId],
			);
			const row = result.rows[0];
			return row ? mapVersion(row) : null;
		},
		async countByStrategy(strategyId) {
			const result = await client.query(
				"SELECT count(*)::int AS c FROM strategy_versions WHERE strategy_id = $1",
				[strategyId],
			);
			return Number(result.rows[0].c);
		},
		async save(record) {
			await client.query(
				`INSERT INTO strategy_versions (id, strategy_id, organization_id, version_number,
				 source_hash, rules_hash, parameters_hash, lifecycle_state, execution_mode, revision, published_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
				[
					record.id,
					record.strategyId,
					record.organizationId,
					record.versionNumber,
					record.sourceHash,
					record.rulesHash,
					record.parametersHash,
					record.lifecycleState,
					record.executionMode,
					record.revision,
					record.publishedAt,
				],
			);
			return record;
		},
		async update(record) {
			await client.query(
				`UPDATE strategy_versions SET lifecycle_state = $3::strategy_version_lifecycle,
				 revision = $4, published_at = $5, updated_at = now()
				 WHERE id = $1 AND organization_id = $2`,
				[
					record.id,
					record.organizationId,
					record.lifecycleState,
					record.revision,
					record.publishedAt,
				],
			);
			return record;
		},
	};
}

export function createPgBacktestRunRepository(
	client: PoolClient,
): BacktestRunRepository {
	return {
		async findById(backtestRunId, organizationId) {
			const result = await client.query(
				`SELECT * FROM strategies_backtest_runs
				 WHERE id = $1 AND organization_id = $2`,
				[backtestRunId, organizationId],
			);
			const row = result.rows[0];
			return row ? mapBacktestRun(row) : null;
		},
		async save(record) {
			await client.query(
				`INSERT INTO strategies_backtest_runs (
					id, organization_id, strategy_id, strategy_version_id,
					dataset_id, dataset_revision, seed, status, result_ref, metrics_hash
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				[
					record.id,
					record.organizationId,
					record.strategyId,
					record.strategyVersionId,
					record.datasetId,
					record.datasetRevision,
					record.seed,
					record.status,
					record.resultRef,
					record.metricsHash,
				],
			);
			return record;
		},
		async update(record) {
			await client.query(
				`UPDATE strategies_backtest_runs
				 SET status = $3, result_ref = $4, metrics_hash = $5, updated_at = now()
				 WHERE id = $1 AND organization_id = $2`,
				[
					record.id,
					record.organizationId,
					record.status,
					record.resultRef,
					record.metricsHash,
				],
			);
			return record;
		},
	};
}

type DeploymentRow = {
	id: string;
	organization_id: string;
	strategy_id: string;
	strategy_version_id: string;
	execution_mode: string;
	portfolio_id: string | null;
	binding_snapshot: BindingSnapshot;
	status: string;
	revision: number;
};

type SignalRow = {
	id: string;
	organization_id: string;
	strategy_id: string;
	deployment_id: string | null;
	instrument_refs: string[];
	value_ref: string;
	expires_at: string | Date;
	revision: number;
};

function mapDeployment(row: DeploymentRow): DeploymentRecord {
	return {
		id: row.id,
		organizationId: row.organization_id,
		strategyId: row.strategy_id,
		strategyVersionId: row.strategy_version_id,
		executionMode: row.execution_mode as StrategiesExecutionMode,
		portfolioId: row.portfolio_id,
		bindingSnapshot: row.binding_snapshot,
		status: row.status as DeploymentStatus,
		revision: row.revision,
	};
}

function mapSignal(row: SignalRow): SignalRecord {
	return {
		id: row.id,
		organizationId: row.organization_id,
		strategyId: row.strategy_id,
		deploymentId: row.deployment_id,
		instrumentRefs: row.instrument_refs,
		valueRef: row.value_ref,
		expiresAt: String(row.expires_at),
		revision: row.revision,
	};
}

export function createPgDeploymentRepository(
	client: PoolClient,
): DeploymentRepository {
	return {
		async findById(deploymentId, organizationId) {
			const result = await client.query(
				`SELECT * FROM strategies_deployments
				 WHERE id = $1 AND organization_id = $2`,
				[deploymentId, organizationId],
			);
			const row = result.rows[0];
			return row ? mapDeployment(row) : null;
		},
		async save(record) {
			await client.query(
				`INSERT INTO strategies_deployments (
					id, organization_id, strategy_id, strategy_version_id,
					execution_mode, portfolio_id, binding_snapshot, status, revision
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				[
					record.id,
					record.organizationId,
					record.strategyId,
					record.strategyVersionId,
					record.executionMode,
					record.portfolioId,
					JSON.stringify(record.bindingSnapshot),
					record.status,
					record.revision,
				],
			);
			return record;
		},
		async updateStatus(record) {
			await client.query(
				`UPDATE strategies_deployments
				 SET status = $3, revision = $4, updated_at = now()
				 WHERE id = $1 AND organization_id = $2`,
				[record.id, record.organizationId, record.status, record.revision],
			);
			return record;
		},
	};
}

export function createPgSignalRepository(client: PoolClient): SignalRepository {
	return {
		async save(record) {
			await client.query(
				`INSERT INTO strategies_signals (
					id, organization_id, strategy_id, deployment_id,
					instrument_refs, value_ref, expires_at, revision
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[
					record.id,
					record.organizationId,
					record.strategyId,
					record.deploymentId,
					JSON.stringify(record.instrumentRefs),
					record.valueRef,
					record.expiresAt,
					record.revision,
				],
			);
			return record;
		},
	};
}
