import type { SessionRevocationPort } from "@anxionos/identity";
import { hashSessionRef } from "@anxionos/identity";
import type { Pool } from "pg";

/**
 * Deletes every Better Auth session of the user and returns **hashes** of the
 * deleted session ids. The raw id is a bearer credential and never crosses the
 * module boundary (R03 INV-IDN-03).
 */
export function createBetterAuthSessionRevoker(
	pool: Pool,
): SessionRevocationPort {
	return {
		async revokeAllForAuthUser(authUserId: string) {
			const revokedAt = new Date();
			const result = await pool.query<{ id: string }>(
				'DELETE FROM session WHERE "userId" = $1 RETURNING id',
				[authUserId],
			);
			return result.rows.map((row) => ({
				externalRefHash: hashSessionRef(row.id),
				revokedAt,
			}));
		},
	};
}
