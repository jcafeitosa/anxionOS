import type { Pool } from "pg";
import type {
	CapitalAccountRef,
	CapitalQueryPort,
} from "../../domain/ports/capital-query-port";

export function createPgCapitalQueryAdapter(pool: Pool): CapitalQueryPort {
	return {
		async findAccountById(organizationId, accountId) {
			const result = await pool.query(
				`SELECT id, organization_id, owner_user_id, base_currency, status
				 FROM capital_accounts
				 WHERE id = $1 AND organization_id = $2`,
				[accountId, organizationId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				accountId: String(row.id),
				organizationId: String(row.organization_id),
				ownerUserId: String(row.owner_user_id),
				baseCurrency: String(row.base_currency),
				status: String(row.status),
			} satisfies CapitalAccountRef;
		},
	};
}
