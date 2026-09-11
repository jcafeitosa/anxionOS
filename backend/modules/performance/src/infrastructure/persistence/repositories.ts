import type { Pool, PoolClient } from "pg";

type PgQueryable = Pool | PoolClient;

import { normalizeDecimalAmount } from "../../domain/decimal-amount";
import type {
	ListOutcomeSnapshotsFilter,
	ListPositionExposureSnapshotsFilter,
	MetricSeriesRecord,
	MetricSeriesRepository,
	OutcomeSnapshotRecord,
	OutcomeSnapshotRepository,
	PositionExposureSnapshotRecord,
	PositionExposureSnapshotRepository,
} from "../../domain/ports/performance-unit-of-work";

const DEFAULT_LIST_LIMIT = 50;

function mapOutcomeSnapshot(
	row: Record<string, unknown>,
): OutcomeSnapshotRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		journalEntryId: String(row.journal_entry_id),
		valueDate: String(row.value_date),
		linesSummary: row.lines_summary as OutcomeSnapshotRecord["linesSummary"],
		recordedAt: (row.recorded_at as Date).toISOString(),
	};
}
export function createPgOutcomeSnapshotRepository(
	client: PgQueryable,
): OutcomeSnapshotRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM performance_outcome_snapshots WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapOutcomeSnapshot(row) : null;
		},
		async findByOrganizationAndId(organizationId, id) {
			const result = await client.query(
				`SELECT * FROM performance_outcome_snapshots
				 WHERE id = $1 AND organization_id = $2`,
				[id, organizationId],
			);
			const row = result.rows[0];
			return row ? mapOutcomeSnapshot(row) : null;
		},
		async findByJournalEntryId(journalEntryId) {
			const result = await client.query(
				"SELECT * FROM performance_outcome_snapshots WHERE journal_entry_id = $1",
				[journalEntryId],
			);
			const row = result.rows[0];
			return row ? mapOutcomeSnapshot(row) : null;
		},
		async listByOrganizationId(organizationId, filter = {}) {
			const limit = filter.limit ?? DEFAULT_LIST_LIMIT;
			const params: unknown[] = [organizationId];
			let sql = `SELECT * FROM performance_outcome_snapshots
			 WHERE organization_id = $1`;
			if (filter.journalEntryId) {
				params.push(filter.journalEntryId);
				sql += ` AND journal_entry_id = $${params.length}`;
			}
			params.push(limit);
			sql += ` ORDER BY recorded_at DESC LIMIT $${params.length}`;
			const result = await client.query(sql, params);
			return result.rows.map((row) => mapOutcomeSnapshot(row));
		},
		async save(record: OutcomeSnapshotRecord) {
			await client.query(
				`INSERT INTO performance_outcome_snapshots (
			   id, organization_id, journal_entry_id, value_date, lines_summary, recorded_at
			 ) VALUES ($1,$2,$3,$4,$5,$6)`,
				[
					record.id,
					record.organizationId,
					record.journalEntryId,
					record.valueDate,
					JSON.stringify(record.linesSummary),
					record.recordedAt,
				],
			);
			return record;
		},
	};
}
function mapPositionExposureSnapshot(
	row: Record<string, unknown>,
): PositionExposureSnapshotRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		portfolioId: String(row.portfolio_id),
		positionId: String(row.position_id),
		revision: Number(row.revision),
		instrumentId: String(row.instrument_id),
		positionSide: String(row.position_side),
		book: String(row.book),
		quantity: normalizeDecimalAmount(String(row.quantity)),
		fillId: String(row.fill_id),
		side: String(row.side),
		provisionalCash: Boolean(row.provisional_cash),
		observedAt: (row.observed_at as Date).toISOString(),
	};
}

export function createPgPositionExposureSnapshotRepository(
	client: PgQueryable,
): PositionExposureSnapshotRepository {
	return {
		async findByOrganizationAndId(organizationId, id) {
			const result = await client.query(
				`SELECT * FROM performance_position_exposure_snapshots
				 WHERE id = $1 AND organization_id = $2`,
				[id, organizationId],
			);
			const row = result.rows[0];
			return row ? mapPositionExposureSnapshot(row) : null;
		},
		async findByPositionRevision(positionId, revision) {
			const result = await client.query(
				`SELECT * FROM performance_position_exposure_snapshots
				 WHERE position_id = $1 AND revision = $2`,
				[positionId, revision],
			);
			const row = result.rows[0];
			return row ? mapPositionExposureSnapshot(row) : null;
		},
		async findLatestRevision(positionId) {
			const result = await client.query(
				`SELECT * FROM performance_position_exposure_snapshots
				 WHERE position_id = $1
				 ORDER BY revision DESC
				 LIMIT 1`,
				[positionId],
			);
			const row = result.rows[0];
			return row ? mapPositionExposureSnapshot(row) : null;
		},
		async listByOrganizationId(organizationId, filter = {}) {
			const limit = filter.limit ?? DEFAULT_LIST_LIMIT;
			const params: unknown[] = [organizationId];
			let sql = `SELECT * FROM performance_position_exposure_snapshots
			 WHERE organization_id = $1`;
			if (filter.portfolioId) {
				params.push(filter.portfolioId);
				sql += ` AND portfolio_id = $${params.length}`;
			}
			if (filter.positionId) {
				params.push(filter.positionId);
				sql += ` AND position_id = $${params.length}`;
			}
			params.push(limit);
			sql += ` ORDER BY observed_at DESC, revision DESC LIMIT $${params.length}`;
			const result = await client.query(sql, params);
			return result.rows.map((row) => mapPositionExposureSnapshot(row));
		},
		async save(record) {
			await client.query(
				`INSERT INTO performance_position_exposure_snapshots (
				   id, organization_id, portfolio_id, position_id, revision,
				   instrument_id, position_side, book, quantity, fill_id, side,
				   provisional_cash, observed_at
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
				[
					record.id,
					record.organizationId,
					record.portfolioId,
					record.positionId,
					record.revision,
					record.instrumentId,
					record.positionSide,
					record.book,
					record.quantity,
					record.fillId,
					record.side,
					record.provisionalCash,
					record.observedAt,
				],
			);
			return record;
		},
	};
}

function mapMetricSeries(row: Record<string, unknown>): MetricSeriesRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		outcomeSnapshotId: row.outcome_snapshot_id
			? String(row.outcome_snapshot_id)
			: undefined,
		positionExposureSnapshotId: row.position_exposure_snapshot_id
			? String(row.position_exposure_snapshot_id)
			: undefined,
		metricName: String(row.metric_name),
		metricValue: normalizeDecimalAmount(String(row.metric_value)),
		observedAt: (row.observed_at as Date).toISOString(),
	};
}

export function createPgMetricSeriesRepository(
	client: PgQueryable,
): MetricSeriesRepository {
	return {
		async findByOutcomeAndMetric(outcomeSnapshotId, metricName) {
			const result = await client.query(
				`SELECT * FROM performance_metric_series
				 WHERE outcome_snapshot_id = $1 AND metric_name = $2`,
				[outcomeSnapshotId, metricName],
			);
			const row = result.rows[0];
			return row ? mapMetricSeries(row) : null;
		},
		async findByPositionExposureAndMetric(
			positionExposureSnapshotId,
			metricName,
		) {
			const result = await client.query(
				`SELECT * FROM performance_metric_series
				 WHERE position_exposure_snapshot_id = $1 AND metric_name = $2`,
				[positionExposureSnapshotId, metricName],
			);
			const row = result.rows[0];
			return row ? mapMetricSeries(row) : null;
		},
		async listByOutcomeSnapshotId(outcomeSnapshotId) {
			const result = await client.query(
				`SELECT * FROM performance_metric_series
				 WHERE outcome_snapshot_id = $1
				 ORDER BY metric_name`,
				[outcomeSnapshotId],
			);
			return result.rows.map((row) => mapMetricSeries(row));
		},
		async listByPositionExposureSnapshotId(positionExposureSnapshotId) {
			const result = await client.query(
				`SELECT * FROM performance_metric_series
				 WHERE position_exposure_snapshot_id = $1
				 ORDER BY metric_name`,
				[positionExposureSnapshotId],
			);
			return result.rows.map((row) => mapMetricSeries(row));
		},
		async save(record: MetricSeriesRecord) {
			await client.query(
				`INSERT INTO performance_metric_series (
			   id, organization_id, outcome_snapshot_id, position_exposure_snapshot_id,
			   metric_name, metric_value, observed_at
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					record.id,
					record.organizationId,
					record.outcomeSnapshotId ?? null,
					record.positionExposureSnapshotId ?? null,
					record.metricName,
					record.metricValue,
					record.observedAt,
				],
			);
			return record;
		},
	};
}
