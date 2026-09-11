import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool, PoolClient } from "pg";

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

// Per-module migration journal (ADR0002). Isolated from shared drizzle.__drizzle_migrations.
export async function ensureEvaluationSchema(
	poolOrClient: Pool | PoolClient,
): Promise<void> {
	const db = drizzle(poolOrClient);
	await migrate(db, {
		migrationsFolder,
		migrationsSchema: "evaluation",
		migrationsTable: "__drizzle_migrations",
	});
}

const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
	const { Pool: PgPool } = await import("pg");
	const pool = new PgPool({ connectionString: databaseUrl });
	await ensureEvaluationSchema(pool);
	await pool.end();
	console.log("evaluation migrations applied");
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	});
}
