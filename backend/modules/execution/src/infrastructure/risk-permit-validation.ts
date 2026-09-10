import type { Pool, PoolClient } from "pg";
import type { RiskPermitValidationPort } from "../domain/ports/risk-permit-validation";

async function tableExists(
	client: Pool | PoolClient,
	tableName: string,
): Promise<boolean> {
	const result = await client.query(
		`SELECT EXISTS (
		   SELECT 1 FROM information_schema.tables
		   WHERE table_schema = 'public' AND table_name = $1
		 ) AS exists`,
		[tableName],
	);
	return Boolean(result.rows[0]?.exists);
}
export function createPgRiskPermitValidationPort(
	client: Pool | PoolClient,
): RiskPermitValidationPort {
	return {
		async validatePermit(input) {
			const hasRiskPermits = await tableExists(client, "risk_permits");
			if (!hasRiskPermits) {
				return { valid: false, failure: "NOT_FOUND" };
			}
			const result = await client.query(
				`SELECT id, organization_id, intent_hash, authority_epoch, risk_epoch, status
				 FROM risk_permits WHERE id = $1`,
				[input.riskPermitId],
			);
			const row = result.rows[0];
			if (!row) {
				return { valid: false, failure: "NOT_FOUND" };
			}
			if (row.organization_id !== input.organizationId) {
				return { valid: false, failure: "NOT_FOUND" };
			}
			if (row.status !== "ISSUED") {
				return { valid: false, failure: "NOT_ISSUED" };
			}
			if (row.intent_hash !== input.intentHash) {
				return { valid: false, failure: "INTENT_MISMATCH" };
			}
			if (
				row.authority_epoch !== input.authorityEpoch ||
				row.risk_epoch !== input.riskEpoch
			) {
				return { valid: false, failure: "STALE" };
			}
			return { valid: true };
		},
	};
}
