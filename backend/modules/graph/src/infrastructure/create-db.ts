import type { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./persistence/schema";

export function createGraphDb(pool) {
    const db = drizzle(pool, { schema });
    return {
        db,
        schema,
    };
}
