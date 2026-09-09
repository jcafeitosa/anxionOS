import type { Pool } from "pg";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");
export async function ensureOrchestrationSchema(pool) {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder });
}
const databaseUrl = process.env.DATABASE_URL ??
    "postgres://anxionos:anxionos@localhost:5432/anxionos";
async function main() {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    await ensureOrchestrationSchema(pool);
    await pool.end();
    console.log("orchestration migrations applied");
}
if (import.meta.main) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
