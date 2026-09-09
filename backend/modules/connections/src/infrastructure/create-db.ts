import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "./persistence/schema";

export function createConnectionsDb(pool: Pool) {
	return drizzle(pool, { schema });
}
