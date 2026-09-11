import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool, PoolClient } from "pg";

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

export async function ensureAuditSchema(
	poolOrClient: Pool | PoolClient,
): Promise<void> {
	const db = drizzle(poolOrClient);
	// Per-module journal (ANX-463): the shared drizzle.__drizzle_migrations table
	// compares only its newest row, so modules silently skip each other's migrations.
	await migrate(db, {
		migrationsFolder,
		migrationsSchema: "audit",
		migrationsTable: "__drizzle_migrations",
	});
}

const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
	const { Pool: PgPool } = await import("pg");
	const pool = new PgPool({ connectionString: databaseUrl });
	await ensureAuditSchema(pool);
	await pool.end();
	console.log("audit migrations applied");
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	});
}
