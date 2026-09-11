import type { Pool, PoolClient } from "pg";
import { SimulationRunRevisionConflictError } from "../../domain/errors/simulation-run-errors";
import type {
	SimulationManifestRecord,
	SimulationManifestRepository,
	SimulationRunRecord,
	SimulationRunRepository,
	SimulationSnapshotRecord,
	SimulationSnapshotRepository,
} from "../../domain/ports/simulation-unit-of-work";

type PgQueryable = Pool | PoolClient;

const DEFAULT_LIST_LIMIT = 50;

function mapManifest(row: Record<string, unknown>): SimulationManifestRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		fidelityTier: String(row.fidelity_tier),
		datasetHash: String(row.dataset_hash),
		sandboxPolicy: (row.sandbox_policy as Record<string, unknown>) ?? {},
		manifestPayload:
			(row.manifest_payload as Record<string, unknown> | null) ?? null,
	};
}

function mapRun(row: Record<string, unknown>): SimulationRunRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		manifestId: row.manifest_id ? String(row.manifest_id) : null,
		strategyId: row.strategy_id ? String(row.strategy_id) : null,
		strategyVersionId: row.strategy_version_id
			? String(row.strategy_version_id)
			: null,
		backtestRequestId: row.backtest_request_id
			? String(row.backtest_request_id)
			: null,
		executionMode: String(row.execution_mode),
		status: String(row.status),
		scenarioLabel: row.scenario_label ? String(row.scenario_label) : null,
		isolationFlags:
			row.isolation_flags as SimulationRunRecord["isolationFlags"],
		seedHash: row.seed_hash ? String(row.seed_hash) : null,
		resultRef: row.result_ref ? String(row.result_ref) : null,
		revision: Number(row.revision ?? 1),
		startedAt: (row.started_at as Date).toISOString(),
		completedAt: row.completed_at
			? (row.completed_at as Date).toISOString()
			: null,
		failedAt: row.failed_at ? (row.failed_at as Date).toISOString() : null,
		failureCode: row.failure_code ? String(row.failure_code) : null,
	};
}

function mapSnapshot(row: Record<string, unknown>): SimulationSnapshotRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		simulationRunId: String(row.simulation_run_id),
		datasetRef: row.dataset_ref ? String(row.dataset_ref) : null,
		datasetHash: String(row.dataset_hash),
		snapshotPayload:
			(row.snapshot_payload as Record<string, unknown> | null) ?? null,
	};
}

export function createPgSimulationManifestRepository(
	client: PgQueryable,
): SimulationManifestRepository {
	return {
		async save(record) {
			await client.query(
				`INSERT INTO simulation_manifests (
			   id, organization_id, fidelity_tier, dataset_hash, sandbox_policy, manifest_payload
			 ) VALUES ($1,$2,$3,$4,$5,$6)`,
				[
					record.id,
					record.organizationId,
					record.fidelityTier,
					record.datasetHash,
					record.sandboxPolicy,
					record.manifestPayload,
				],
			);
			return record;
		},
		async findByOrganizationAndId(organizationId, id) {
			const result = await client.query(
				`SELECT * FROM simulation_manifests
			 WHERE organization_id = $1 AND id = $2`,
				[organizationId, id],
			);
			const row = result.rows[0];
			return row ? mapManifest(row) : null;
		},
	};
}

export function createPgSimulationRunRepository(
	client: PgQueryable,
): SimulationRunRepository {
	return {
		async save(record) {
			await client.query(
				`INSERT INTO simulation_runs (
			   id, organization_id, manifest_id, strategy_id, strategy_version_id,
			   backtest_request_id, execution_mode, status, scenario_label, isolation_flags,
			   seed_hash, result_ref, revision, started_at, completed_at, failed_at, failure_code
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
				[
					record.id,
					record.organizationId,
					record.manifestId,
					record.strategyId,
					record.strategyVersionId,
					record.backtestRequestId,
					record.executionMode,
					record.status,
					record.scenarioLabel,
					record.isolationFlags,
					record.seedHash,
					record.resultRef,
					record.revision,
					record.startedAt,
					record.completedAt,
					record.failedAt,
					record.failureCode,
				],
			);
			return record;
		},
		async update(record) {
			const expectedRevision = record.revision - 1;
			const result = await client.query(
				`UPDATE simulation_runs
				 SET status = $3,
				     result_ref = $4,
				     revision = $5,
				     completed_at = $6,
				     failed_at = $7,
				     failure_code = $8,
				     updated_at = NOW()
				 WHERE id = $1 AND organization_id = $2 AND revision = $9`,
				[
					record.id,
					record.organizationId,
					record.status,
					record.resultRef,
					record.revision,
					record.completedAt,
					record.failedAt,
					record.failureCode,
					expectedRevision,
				],
			);
			if (result.rowCount === 0) {
				throw new SimulationRunRevisionConflictError();
			}
			return record;
		},
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM simulation_runs WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapRun(row) : null;
		},
		async findByOrganizationAndId(organizationId, id) {
			const result = await client.query(
				`SELECT * FROM simulation_runs
			 WHERE organization_id = $1 AND id = $2`,
				[organizationId, id],
			);
			const row = result.rows[0];
			return row ? mapRun(row) : null;
		},
		async findByOrganizationAndBacktestRequestId(
			organizationId,
			backtestRequestId,
		) {
			const result = await client.query(
				`SELECT * FROM simulation_runs
			 WHERE organization_id = $1 AND backtest_request_id = $2`,
				[organizationId, backtestRequestId],
			);
			const row = result.rows[0];
			return row ? mapRun(row) : null;
		},
		async listByOrganizationId(organizationId, filter = {}) {
			const limit = filter.limit ?? DEFAULT_LIST_LIMIT;
			const params: unknown[] = [organizationId];
			let sql = `SELECT * FROM simulation_runs
			 WHERE organization_id = $1`;
			if (filter.status) {
				params.push(filter.status);
				sql += ` AND status = $${params.length}`;
			}
			if (filter.backtestRequestId) {
				params.push(filter.backtestRequestId);
				sql += ` AND backtest_request_id = $${params.length}`;
			}
			if (filter.strategyId) {
				params.push(filter.strategyId);
				sql += ` AND strategy_id = $${params.length}`;
			}
			params.push(limit);
			sql += ` ORDER BY started_at DESC LIMIT $${params.length}`;
			const result = await client.query(sql, params);
			return result.rows.map((row) => mapRun(row));
		},
	};
}

export function createPgSimulationSnapshotRepository(
	client: PgQueryable,
): SimulationSnapshotRepository {
	return {
		async save(record) {
			await client.query(
				`INSERT INTO simulation_snapshots (
			   id, organization_id, simulation_run_id, dataset_ref, dataset_hash, snapshot_payload
			 ) VALUES ($1,$2,$3,$4,$5,$6)`,
				[
					record.id,
					record.organizationId,
					record.simulationRunId,
					record.datasetRef,
					record.datasetHash,
					record.snapshotPayload,
				],
			);
			return record;
		},
		async findByOrganizationAndRunId(organizationId, simulationRunId) {
			const result = await client.query(
				`SELECT * FROM simulation_snapshots
				 WHERE organization_id = $1 AND simulation_run_id = $2
				 ORDER BY created_at DESC
				 LIMIT 1`,
				[organizationId, simulationRunId],
			);
			const row = result.rows[0];
			return row ? mapSnapshot(row) : null;
		},
	};
}

export function createSimulationDb(pool: Pool | PoolClient) {
	return {
		manifests: createPgSimulationManifestRepository(pool),
		runs: createPgSimulationRunRepository(pool),
		snapshots: createPgSimulationSnapshotRepository(pool),
	};
}
