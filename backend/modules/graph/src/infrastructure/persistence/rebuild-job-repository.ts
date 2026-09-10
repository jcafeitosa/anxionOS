import type { Pool, PoolClient } from "pg";
import type {
	CreateRebuildJobInput,
	RebuildControl,
	RebuildJob,
	RebuildJobStatus,
} from "../../domain/ports/rebuild-control";
import {
	GRAPH_REBUILD_PENDING_BLOCK_THRESHOLD,
	GRAPH_REBUILD_TERMINAL_STATUSES,
} from "../../domain/rebuild/constants";
import { RebuildError } from "../../domain/rebuild/errors";

function rowToJob(row) {
	const ownerDomainOrder = Array.isArray(row.owner_domain_order)
		? row.owner_domain_order
		: [];
	return {
		jobId: String(row.job_id),
		status: row.status,
		targetGeneration: Number(row.target_generation),
		cutoffCheckpoint: Number(row.cutoff_checkpoint),
		ownerDomainOrder,
		registryGeneration: Number(row.registry_generation),
		auditManifestId: row.audit_manifest_id ?? undefined,
	};
}
export async function getCurrentGeneration(pool) {
	const result = await pool.query(
		`SELECT generation FROM graph_current_generation WHERE id = 'current'`,
	);
	return Number(result.rows[0]?.generation ?? 0);
}
export async function getProjectionGeneration(pool, consumerName) {
	const result = await pool.query(
		"SELECT generation FROM graph_projection_generation WHERE consumer_name = $1",
		[consumerName],
	);
	return Number(result.rows[0]?.generation ?? 0);
}
export async function getRegistryGeneration(pool) {
	const result = await pool.query(
		`SELECT generation FROM graph_registry_generation WHERE id = 'current'`,
	);
	return Number(result.rows[0]?.generation ?? 1);
}
export async function countPendingInboxEntries(pool) {
	const result = await pool.query(`SELECT COUNT(*)::int AS count
		   FROM graph_projection_inbox
		  WHERE status = 'pending'`);
	return Number(result.rows[0]?.count ?? 0);
}
export async function findActiveRebuildJob(pool) {
	const result = await pool.query(
		`SELECT job_id, status, target_generation, cutoff_checkpoint,
		        owner_domain_order, registry_generation, audit_manifest_id
		   FROM graph_rebuild_jobs
		  WHERE status <> ALL($1::graph_rebuild_status[])
		  ORDER BY created_at DESC
		  LIMIT 1`,
		[GRAPH_REBUILD_TERMINAL_STATUSES],
	);
	const row = result.rows[0];
	return row ? rowToJob(row) : null;
}
export async function findRebuildJobById(pool, jobId) {
	const result = await pool.query(
		`SELECT job_id, status, target_generation, cutoff_checkpoint,
		        owner_domain_order, registry_generation, audit_manifest_id
		   FROM graph_rebuild_jobs
		  WHERE job_id = $1`,
		[jobId],
	);
	const row = result.rows[0];
	return row ? rowToJob(row) : null;
}
export async function createRebuildJobRecord(pool, input) {
	const pending = await countPendingInboxEntries(pool);
	if (pending > GRAPH_REBUILD_PENDING_BLOCK_THRESHOLD) {
		throw new RebuildError(
			`Pending inbox ${pending} exceeds threshold ${GRAPH_REBUILD_PENDING_BLOCK_THRESHOLD}`,
			"REBUILD_PENDING_THRESHOLD",
		);
	}
	const active = await findActiveRebuildJob(pool);
	if (active) {
		throw new RebuildError(
			`Rebuild job ${active.jobId} already active`,
			"REBUILD_ALREADY_ACTIVE",
		);
	}
	const result = await pool.query(
		`INSERT INTO graph_rebuild_jobs (
		   status, target_generation, cutoff_checkpoint,
		   owner_domain_order, registry_generation, audit_manifest_id
		 ) VALUES ('pending', $1, $2, $3::jsonb, $4, $5)
		 RETURNING job_id, status, target_generation, cutoff_checkpoint,
		           owner_domain_order, registry_generation, audit_manifest_id`,
		[
			input.targetGeneration,
			input.cutoffCheckpoint,
			JSON.stringify(input.ownerDomainOrder),
			input.registryGeneration,
			input.auditManifestId ?? null,
		],
	);
	const row = result.rows[0];
	if (!row) {
		throw new Error("Rebuild job insert returned no row");
	}
	return rowToJob(row);
}
export async function updateRebuildJobStatus(pool, jobId, status) {
	await pool.query(
		`UPDATE graph_rebuild_jobs
		    SET status = $2, updated_at = NOW()
		  WHERE job_id = $1`,
		[jobId, status],
	);
}
export async function swapCurrentGeneration(client, targetGeneration) {
	await client.query(
		`UPDATE graph_current_generation
		    SET generation = $1, updated_at = NOW()
		  WHERE id = 'current'`,
		[targetGeneration],
	);
}
export async function bumpRegistryGeneration(client) {
	const result = await client.query(`UPDATE graph_registry_generation
		    SET generation = generation + 1, updated_at = NOW()
		  WHERE id = 'current'
		  RETURNING generation`);
	return Number(result.rows[0]?.generation ?? 0);
}
/** PG-backed RebuildControl port (S5). */
export function createPgRebuildControl(pool: Pool): RebuildControl {
	return {
		getCurrentGeneration: () => getCurrentGeneration(pool),
		getProjectionGeneration: (consumerName) =>
			getProjectionGeneration(pool, consumerName),
		createRebuildJob: (input) => createRebuildJobRecord(pool, input),
		updateJobStatus: (jobId, status) =>
			updateRebuildJobStatus(pool, jobId, status),
	};
}
