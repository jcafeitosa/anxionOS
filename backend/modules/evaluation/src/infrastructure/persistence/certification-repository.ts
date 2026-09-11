import type { Pool, PoolClient } from "pg";

type PgQueryable = Pool | PoolClient;

import type {
	CertificationRepository,
	CertificationRow,
} from "../../domain/ports/certification";

function mapCertificationRow(row: Record<string, unknown>): CertificationRow {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		subjectType: row.subject_type as CertificationRow["subjectType"],
		strategyId: String(row.strategy_id),
		strategyVersionId: String(row.strategy_version_id),
		evaluationRecordId: row.evaluation_record_id
			? String(row.evaluation_record_id)
			: undefined,
		policyHash: row.policy_hash ? String(row.policy_hash) : undefined,
		status: row.status as CertificationRow["status"],
		issuedAt: (row.issued_at as Date).toISOString(),
		revokedAt: row.revoked_at
			? (row.revoked_at as Date).toISOString()
			: undefined,
	};
}

export function createPgCertificationRepository(
	client: PgQueryable,
): CertificationRepository {
	return {
		async findById(id) {
			const result = await client.query(
				`SELECT id, organization_id, subject_type, strategy_id, strategy_version_id,
				        evaluation_record_id, policy_hash, status, issued_at, revoked_at
				 FROM evaluation_certifications
				 WHERE id = $1`,
				[id],
			);
			const row = result.rows[0];
			return row ? mapCertificationRow(row) : null;
		},
		async findBySubject(input) {
			const result = await client.query(
				`SELECT id, organization_id, subject_type, strategy_id, strategy_version_id,
				        evaluation_record_id, policy_hash, status, issued_at, revoked_at
				 FROM evaluation_certifications
				 WHERE organization_id = $1
				   AND subject_type = $2
				   AND strategy_id = $3
				   AND strategy_version_id = $4
				   AND COALESCE(policy_hash, '') = COALESCE($5, '')
				   AND status = 'issued'`,
				[
					input.organizationId,
					input.subjectType,
					input.strategyId,
					input.strategyVersionId,
					input.policyHash ?? null,
				],
			);
			const row = result.rows[0];
			return row ? mapCertificationRow(row) : null;
		},
		async save(row) {
			await client.query(
				`INSERT INTO evaluation_certifications (
				   id, organization_id, subject_type, strategy_id, strategy_version_id,
				   evaluation_record_id, policy_hash, status, issued_at, revoked_at
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				[
					row.id,
					row.organizationId,
					row.subjectType,
					row.strategyId,
					row.strategyVersionId,
					row.evaluationRecordId ?? null,
					row.policyHash ?? null,
					row.status,
					row.issuedAt,
					row.revokedAt ?? null,
				],
			);
			return row;
		},
	};
}
