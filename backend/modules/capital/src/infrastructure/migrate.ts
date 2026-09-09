import type { Pool, PoolClient } from "pg";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");
export async function ensureCapitalSchema(poolOrClient) {
    const db = drizzle(poolOrClient);
    await migrate(db, { migrationsFolder });
}
const databaseUrl = process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";
async function main() {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    await ensureCapitalSchema(pool);
    await pool.end();
    console.log("capital migrations applied");
}
if (import.meta.main) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
