import type { SessionRevoker } from "@anxionos/identity";
import type { Pool } from "pg";

export function createBetterAuthSessionRevoker(pool: Pool): SessionRevoker {
	return {
		async revokeAllForAuthUser(authUserId: string): Promise<void> {
			await pool.query('DELETE FROM session WHERE "userId" = $1', [authUserId]);
		},
	};
}
