import type { Pool, PoolClient } from "pg";
import type {
	BackfillJobRecord,
	BackfillJobRepository,
	BackfillJobStatus,
} from "../../domain/ports/backfill-repository";

function asBackfillJobStatus(value: string): BackfillJobStatus {
	switch (value) {
		case "PENDING":
		case "RUNNING":
		case "PAUSED":
		case "COMPLETED":
		case "FAILED":
			return value;
		default:
			throw new Error(`unexpected backfill status: ${value}`);
	}
}

function mapBackfillJobRow(row: Record<string, unknown>): BackfillJobRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		instrumentId: String(row.instrument_id),
		requestedFrom:
			row.requested_from instanceof Date
				? row.requested_from.toISOString()
				: String(row.requested_from),
		requestedTo:
			row.requested_to instanceof Date
				? row.requested_to.toISOString()
				: String(row.requested_to),
		cursorPosition:
			row.cursor_position == null ? null : String(row.cursor_position),
		status: asBackfillJobStatus(String(row.status)),
		lastError: row.last_error == null ? null : String(row.last_error),
		rowsIngested: Number(row.rows_ingested),
		createdAt:
			row.created_at instanceof Date
				? row.created_at.toISOString()
				: String(row.created_at),
		updatedAt:
			row.updated_at instanceof Date
				? row.updated_at.toISOString()
				: String(row.updated_at),
	};
}

function jobId(recordId: string): string {
	return recordId.startsWith("md_bf_") ? recordId : `md_bf_${recordId}`;
}

export function createPgBackfillJobRepository(
	client: Pool | PoolClient,
): BackfillJobRepository {
	return {
		async findById(jobIdValue, organizationId) {
			const result = await client.query(
				"SELECT * FROM market_data_backfill_jobs WHERE id = $1 AND organization_id = $2",
				[jobIdValue, organizationId],
			);
			const row = result.rows[0] as Record<string, unknown> | undefined;
			if (!row) return null;
			return mapBackfillJobRow(row);
		},
		async findActiveByInstrument(organizationId, instrumentId) {
			const result = await client.query(
				`SELECT * FROM market_data_backfill_jobs
				 WHERE organization_id = $1 AND instrument_id = $2
				 AND status IN (
					'PENDING'::market_data_backfill_job_status,
					'RUNNING'::market_data_backfill_job_status,
					'PAUSED'::market_data_backfill_job_status
				 )
				 ORDER BY created_at DESC
				 LIMIT 1`,
				[organizationId, instrumentId],
			);
			const row = result.rows[0] as Record<string, unknown> | undefined;
			if (!row) return null;
			return mapBackfillJobRow(row);
		},
		async save(record) {
			const result = await client.query(
				`INSERT INTO market_data_backfill_jobs (
					id, organization_id, instrument_id, requested_from, requested_to,
					cursor_position, status, last_error, rows_ingested, created_at, updated_at
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
				 ON CONFLICT (organization_id, instrument_id, requested_from, requested_to)
				 DO UPDATE SET
					 updated_at = market_data_backfill_jobs.updated_at
				 RETURNING *`,
				[
					jobId(record.id),
					record.organizationId,
					record.instrumentId,
					record.requestedFrom,
					record.requestedTo,
					record.cursorPosition,
					record.status,
					record.lastError,
					record.rowsIngested,
					record.createdAt,
					record.updatedAt,
				],
			);
			return mapBackfillJobRow(result.rows[0] as Record<string, unknown>);
		},
		async advanceCursor(input) {
			const result = await client.query(
				`UPDATE market_data_backfill_jobs
				 SET
					 cursor_position = $3,
					 rows_ingested = $4,
					 status = $5,
					 last_error = $6,
					 updated_at = NOW()
				 WHERE id = $1
					 AND organization_id = $2
					 AND status IN (
						'PENDING'::market_data_backfill_job_status,
						'RUNNING'::market_data_backfill_job_status
					 )
					 AND rows_ingested <= $4
				 RETURNING *`,
				[
					input.id,
					input.organizationId,
					input.cursorPosition,
					input.rowsIngested,
					input.status,
					input.lastError,
				],
			);
			const row = result.rows[0] as Record<string, unknown> | undefined;
			if (!row) return null;
			return mapBackfillJobRow(row);
		},
	};
}
