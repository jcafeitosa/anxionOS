import type { PoolClient } from "pg";
import type {
  MetricSeriesRecord,
  MetricSeriesRepository,
  OutcomeSnapshotRecord,
  OutcomeSnapshotRepository,
} from "../../domain/ports/performance-unit-of-work";

function mapOutcomeSnapshot(row: Record<string, unknown>): OutcomeSnapshotRecord {
    return {
        id: String(row.id),
        organizationId: String(row.organization_id),
        journalEntryId: String(row.journal_entry_id),
        valueDate: String(row.value_date),
        linesSummary: row.lines_summary as OutcomeSnapshotRecord["linesSummary"],
        recordedAt: (row.recorded_at as Date).toISOString(),
    };
}
export function createPgOutcomeSnapshotRepository(client: PoolClient): OutcomeSnapshotRepository {
    return {
        async findById(id) {
            const result = await client.query(`SELECT * FROM performance_outcome_snapshots WHERE id = $1`, [id]);
            const row = result.rows[0];
            return row ? mapOutcomeSnapshot(row) : null;
        },
        async findByJournalEntryId(journalEntryId) {
            const result = await client.query(`SELECT * FROM performance_outcome_snapshots WHERE journal_entry_id = $1`, [journalEntryId]);
            const row = result.rows[0];
            return row ? mapOutcomeSnapshot(row) : null;
        },
        async save(record: OutcomeSnapshotRecord) {
            await client.query(`INSERT INTO performance_outcome_snapshots (
			   id, organization_id, journal_entry_id, value_date, lines_summary, recorded_at
			 ) VALUES ($1,$2,$3,$4,$5,$6)`, [
                record.id,
                record.organizationId,
                record.journalEntryId,
                record.valueDate,
                JSON.stringify(record.linesSummary),
                record.recordedAt,
            ]);
            return record;
        },
    };
}
export function createPgMetricSeriesRepository(client: PoolClient): MetricSeriesRepository {
    return {
        async save(record: MetricSeriesRecord) {
            await client.query(`INSERT INTO performance_metric_series (
			   id, organization_id, outcome_snapshot_id, metric_name, metric_value, observed_at
			 ) VALUES ($1,$2,$3,$4,$5,$6)`, [
                record.id,
                record.organizationId,
                record.outcomeSnapshotId,
                record.metricName,
                record.metricValue,
                record.observedAt,
            ]);
            return record;
        },
    };
}
