import type { Pool, PoolClient } from "pg";
import { normalizeDecimalAmount } from "../../domain/decimal-amount";
import { OFFICIAL_LEDGER_PNL_METRICS } from "../../domain/metric-definitions";
import type {
	MetricPointFilter,
	MetricPointRecord,
	MetricTimeseriesRepository,
	PnlSeriesFilter,
	PnlSeriesPointRecord,
} from "../../domain/ports/metric-timeseries";

type PgQueryable = Pool | PoolClient;

function isPoolClient(client: PgQueryable): client is PoolClient {
	return typeof (client as PoolClient).release === "function";
}

const OFFICIAL_PNL_METRIC_NAMES = new Set<string>(
	Object.values(OFFICIAL_LEDGER_PNL_METRICS),
);

const DEFAULT_LIST_LIMIT = 100;

function mapMetricPoint(row: Record<string, unknown>): MetricPointRecord {
	return {
		observedAt: (row.observed_at as Date).toISOString(),
		organizationId: String(row.organization_id),
		metricSeriesId: String(row.metric_series_id),
		metricName: String(row.metric_name),
		metricValue: normalizeDecimalAmount(String(row.metric_value)),
		outcomeSnapshotId: row.outcome_snapshot_id
			? String(row.outcome_snapshot_id)
			: undefined,
		positionExposureSnapshotId: row.position_exposure_snapshot_id
			? String(row.position_exposure_snapshot_id)
			: undefined,
		portfolioId: row.portfolio_id ? String(row.portfolio_id) : undefined,
		positionId: row.position_id ? String(row.position_id) : undefined,
	};
}

function mapPnlSeriesPoint(row: Record<string, unknown>): PnlSeriesPointRecord {
	return {
		observedAt: (row.observed_at as Date).toISOString(),
		organizationId: String(row.organization_id),
		metricSeriesId: String(row.metric_series_id),
		outcomeSnapshotId: String(row.outcome_snapshot_id),
		journalEntryId: String(row.journal_entry_id),
		metricName: String(row.metric_name),
		metricValue: normalizeDecimalAmount(String(row.metric_value)),
	};
}

export function createPgMetricTimeseriesRepository(
	client: PgQueryable,
): MetricTimeseriesRepository {
	return {
		async mirrorMetricSeries(record, context = {}) {
			await client.query(
				`INSERT INTO performance_metric_points (
				   observed_at, organization_id, metric_series_id, metric_name, metric_value,
				   outcome_snapshot_id, position_exposure_snapshot_id, portfolio_id, position_id
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
				 ON CONFLICT (metric_series_id, observed_at) DO NOTHING`,
				[
					record.observedAt,
					record.organizationId,
					record.id,
					record.metricName,
					record.metricValue,
					record.outcomeSnapshotId ?? null,
					record.positionExposureSnapshotId ?? null,
					context.portfolioId ?? null,
					context.positionId ?? null,
				],
			);

			if (
				record.outcomeSnapshotId &&
				OFFICIAL_PNL_METRIC_NAMES.has(record.metricName) &&
				context.journalEntryId
			) {
				await client.query(
					`INSERT INTO performance_pnl_series (
					   observed_at, organization_id, metric_series_id, outcome_snapshot_id,
					   journal_entry_id, metric_name, metric_value
					 ) VALUES ($1,$2,$3,$4,$5,$6,$7)
					 ON CONFLICT (metric_series_id, observed_at) DO NOTHING`,
					[
						record.observedAt,
						record.organizationId,
						record.id,
						record.outcomeSnapshotId,
						context.journalEntryId,
						record.metricName,
						record.metricValue,
					],
				);
			}
		},
		async listMetricPoints(organizationId, filter = {}) {
			const limit = filter.limit ?? DEFAULT_LIST_LIMIT;
			const params: unknown[] = [organizationId];
			let sql = `SELECT * FROM performance_metric_points WHERE organization_id = $1`;
			if (filter.metricName) {
				params.push(filter.metricName);
				sql += ` AND metric_name = $${params.length}`;
			}
			if (filter.observedAtFrom) {
				params.push(filter.observedAtFrom);
				sql += ` AND observed_at >= $${params.length}::timestamptz`;
			}
			if (filter.observedAtTo) {
				params.push(filter.observedAtTo);
				sql += ` AND observed_at <= $${params.length}::timestamptz`;
			}
			params.push(limit);
			sql += ` ORDER BY observed_at DESC LIMIT $${params.length}`;
			const result = await client.query(sql, params);
			return result.rows.map((row) => mapMetricPoint(row));
		},
		async listPnlSeriesPoints(organizationId, filter = {}) {
			const limit = filter.limit ?? DEFAULT_LIST_LIMIT;
			const params: unknown[] = [organizationId];
			let sql = `SELECT * FROM performance_pnl_series WHERE organization_id = $1`;
			if (filter.journalEntryId) {
				params.push(filter.journalEntryId);
				sql += ` AND journal_entry_id = $${params.length}`;
			}
			if (filter.metricName) {
				params.push(filter.metricName);
				sql += ` AND metric_name = $${params.length}`;
			}
			if (filter.observedAtFrom) {
				params.push(filter.observedAtFrom);
				sql += ` AND observed_at >= $${params.length}::timestamptz`;
			}
			if (filter.observedAtTo) {
				params.push(filter.observedAtTo);
				sql += ` AND observed_at <= $${params.length}::timestamptz`;
			}
			params.push(limit);
			sql += ` ORDER BY observed_at DESC LIMIT $${params.length}`;
			const result = await client.query(sql, params);
			return result.rows.map((row) => mapPnlSeriesPoint(row));
		},
		async rebuildFromMetricSeries(organizationId) {
			const run = async (queryable: PgQueryable) => {
				const params: unknown[] = [];
				let orgFilter = "";
				if (organizationId) {
					params.push(organizationId);
					orgFilter = ` WHERE ms.organization_id = $${params.length}`;
				}

				const metricPointsResult = await queryable.query<{ inserted: string }>(
					`WITH source AS (
				   SELECT
				     ms.observed_at,
				     ms.organization_id,
				     ms.id AS metric_series_id,
				     ms.metric_name,
				     ms.metric_value,
				     ms.outcome_snapshot_id,
				     ms.position_exposure_snapshot_id,
				     pes.portfolio_id,
				     pes.position_id
				   FROM performance_metric_series ms
				   LEFT JOIN performance_position_exposure_snapshots pes
				     ON pes.id = ms.position_exposure_snapshot_id
				   ${orgFilter}
				 )
				 INSERT INTO performance_metric_points (
				   observed_at, organization_id, metric_series_id, metric_name, metric_value,
				   outcome_snapshot_id, position_exposure_snapshot_id, portfolio_id, position_id
				 )
				 SELECT
				   observed_at, organization_id, metric_series_id, metric_name, metric_value,
				   outcome_snapshot_id, position_exposure_snapshot_id, portfolio_id, position_id
				 FROM source
				 ON CONFLICT (metric_series_id, observed_at) DO NOTHING
				 RETURNING metric_series_id`,
					params,
				);

				const pnlParams: unknown[] = [[...OFFICIAL_PNL_METRIC_NAMES]];
				let pnlOrgFilter = "";
				if (organizationId) {
					pnlParams.push(organizationId);
					pnlOrgFilter = ` AND ms.organization_id = $${pnlParams.length}`;
				}

				const pnlResult = await queryable.query<{ inserted: string }>(
					`WITH source AS (
				   SELECT
				     ms.observed_at,
				     ms.organization_id,
				     ms.id AS metric_series_id,
				     ms.outcome_snapshot_id,
				     os.journal_entry_id,
				     ms.metric_name,
				     ms.metric_value
				   FROM performance_metric_series ms
				   INNER JOIN performance_outcome_snapshots os
				     ON os.id = ms.outcome_snapshot_id
				   WHERE ms.outcome_snapshot_id IS NOT NULL
				     AND ms.metric_name = ANY($1::text[])
				     ${pnlOrgFilter}
				 )
				 INSERT INTO performance_pnl_series (
				   observed_at, organization_id, metric_series_id, outcome_snapshot_id,
				   journal_entry_id, metric_name, metric_value
				 )
				 SELECT
				   observed_at, organization_id, metric_series_id, outcome_snapshot_id,
				   journal_entry_id, metric_name, metric_value
				 FROM source
				 ON CONFLICT (metric_series_id, observed_at) DO NOTHING
				 RETURNING metric_series_id`,
					pnlParams,
				);

				return {
					metricPointsInserted: metricPointsResult.rowCount ?? 0,
					pnlPointsInserted: pnlResult.rowCount ?? 0,
				};
			};

			if (isPoolClient(client)) {
				return run(client);
			}

			const poolClient = await client.connect();
			try {
				await poolClient.query("BEGIN");
				const result = await run(poolClient);
				await poolClient.query("COMMIT");
				return result;
			} catch (error) {
				await poolClient.query("ROLLBACK");
				throw error;
			} finally {
				poolClient.release();
			}
		},
	};
}
