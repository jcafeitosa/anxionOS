import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool, PoolClient } from "pg";

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

// Per-module migration journal (ADR0002). The shared drizzle.__drizzle_migrations
// table can mark 0000_simulation_core applied while a partial run left tables missing.
export async function ensureSimulationSchema(
	poolOrClient: Pool | PoolClient,
): Promise<void> {
	const db = drizzle(poolOrClient);
	await migrate(db, {
		migrationsFolder,
		migrationsSchema: "simulation",
		migrationsTable: "__drizzle_migrations",
	});
}

const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
	const { Pool: PgPool } = await import("pg");
	const pool = new PgPool({ connectionString: databaseUrl });
	await ensureSimulationSchema(pool);
	await pool.end();
	console.log("simulation migrations applied");
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	});
}
