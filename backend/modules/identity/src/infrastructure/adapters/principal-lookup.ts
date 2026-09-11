import type { Pool } from "pg";
import type {
	PrincipalLookup,
	PrincipalLookupResult,
} from "../../domain/ports/principal-lookup";

/**
 * Read-only adapter for the public `PrincipalLookup` port (R03). It never
 * selects `auth_user_id`, so `authUserId` cannot leak through this boundary
 * (D-IDN-003).
 */
export function createPgPrincipalLookup(pool: Pool): PrincipalLookup {
	async function fetch(
		principalId: string,
	): Promise<PrincipalLookupResult | null> {
		const result = await pool.query<{
			id: string;
			kind: PrincipalLookupResult["kind"];
			status: PrincipalLookupResult["status"];
		}>(
			"SELECT id, kind, status FROM identity_principals WHERE id = $1 LIMIT 1",
			[principalId],
		);
		const row = result.rows[0];
		if (!row) {
			return null;
		}
		return { principalId: row.id, kind: row.kind, status: row.status };
	}

	return {
		async exists(principalId: string): Promise<boolean> {
			const result = await pool.query(
				"SELECT 1 FROM identity_principals WHERE id = $1 LIMIT 1",
				[principalId],
			);
			return result.rowCount === 1;
		},
		findById: fetch,
		/** INV-IDN-01: fail-closed — only ACTIVE principals may receive grants. */
		async isActive(principalId: string): Promise<boolean> {
			const principal = await fetch(principalId);
			return principal?.status === "active";
		},
	};
}
