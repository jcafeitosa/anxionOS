import type { Pool } from "pg";
import { BETTER_AUTH_DDL } from "./better-auth-schema-ddl";

export async function ensureBetterAuthSchema(pool: Pool): Promise<void> {
	await pool.query(BETTER_AUTH_DDL);
}
