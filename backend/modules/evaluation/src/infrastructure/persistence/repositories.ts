import type { Pool, PoolClient } from "pg";

type PgQueryable = Pool | PoolClient;

import type {
	EvaluationRecordRepository,
	EvaluationRecordRow,
	EvaluationScoreRepository,
	EvaluationScoreRow,
} from "../../domain/ports/evaluation-unit-of-work";

function mapEvaluationRecord(
	row: Record<string, unknown>,
): EvaluationRecordRow {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		outcomeSnapshotId: String(row.outcome_snapshot_id),
		valueDate: String(row.value_date),
		computedAt: (row.computed_at as Date).toISOString(),
	};
}
function mapEvaluationScore(row: Record<string, unknown>): EvaluationScoreRow {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		evaluationRecordId: String(row.evaluation_record_id),
		scoreMetric: String(row.score_metric),
		scoreValue: String(row.score_value),
		computedAt: (row.computed_at as Date).toISOString(),
	};
}
export function createPgEvaluationRecordRepository(
	client: PgQueryable,
): EvaluationRecordRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM evaluation_records WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapEvaluationRecord(row) : null;
		},
		async findByOutcomeSnapshotId(outcomeSnapshotId) {
			const result = await client.query(
				"SELECT * FROM evaluation_records WHERE outcome_snapshot_id = $1",
				[outcomeSnapshotId],
			);
			const row = result.rows[0];
			return row ? mapEvaluationRecord(row) : null;
		},
		async save(record: EvaluationRecordRow) {
			await client.query(
				`INSERT INTO evaluation_records (
				   id, organization_id, outcome_snapshot_id, value_date, computed_at
				 ) VALUES ($1,$2,$3,$4,$5)`,
				[
					record.id,
					record.organizationId,
					record.outcomeSnapshotId,
					record.valueDate,
					record.computedAt,
				],
			);
			return record;
		},
	};
}
export function createPgEvaluationScoreRepository(
	client: PgQueryable,
): EvaluationScoreRepository {
	return {
		async findByEvaluationRecordId(evaluationRecordId) {
			const result = await client.query(
				"SELECT * FROM evaluation_scores WHERE evaluation_record_id = $1",
				[evaluationRecordId],
			);
			const row = result.rows[0];
			return row ? mapEvaluationScore(row) : null;
		},
		async save(record: EvaluationScoreRow) {
			await client.query(
				`INSERT INTO evaluation_scores (
				   id, organization_id, evaluation_record_id, score_metric, score_value, computed_at
				 ) VALUES ($1,$2,$3,$4,$5,$6)`,
				[
					record.id,
					record.organizationId,
					record.evaluationRecordId,
					record.scoreMetric,
					record.scoreValue,
					record.computedAt,
				],
			);
			return record;
		},
	};
}
