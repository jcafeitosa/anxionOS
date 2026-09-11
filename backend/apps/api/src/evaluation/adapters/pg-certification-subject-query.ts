import type { Pool } from "pg";
import type {
	CertificationSubjectQueryPort,
	StrategyVersionCertificationSubject,
} from "@anxionos/evaluation";

export function createPgCertificationSubjectQueryAdapter(
	pool: Pool,
): CertificationSubjectQueryPort {
	return {
		async findStrategyVersionSubject(input) {
			const result = await pool.query<{
				organization_id: string;
				strategy_id: string;
				strategy_version_id: string;
				lifecycle_state: string;
			}>(
				`SELECT sv.organization_id, s.id AS strategy_id, sv.id AS strategy_version_id,
				        sv.lifecycle_state
				 FROM strategy_versions sv
				 INNER JOIN strategies s ON s.id = sv.strategy_id
				 WHERE sv.organization_id = $1
				   AND s.id = $2
				   AND sv.id = $3`,
				[input.organizationId, input.strategyId, input.strategyVersionId],
			);
			const row = result.rows[0];
			if (!row) return null;
			const subject: StrategyVersionCertificationSubject = {
				organizationId: row.organization_id,
				strategyId: row.strategy_id,
				strategyVersionId: row.strategy_version_id,
				lifecycleState: row.lifecycle_state,
			};
			return subject;
		},
	};
}
