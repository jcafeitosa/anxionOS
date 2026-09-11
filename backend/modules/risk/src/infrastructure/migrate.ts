import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

export async function ensureRiskSchema(pool: Pool): Promise<void> {
	const db = drizzle(pool);
	await migrate(db, {
		migrationsFolder,
		migrationsSchema: "risk",
		migrationsTable: "__drizzle_migrations",
	});
}

const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
	const { Pool: PgPool } = await import("pg");
	const pool = new PgPool({ connectionString: databaseUrl });
	await ensureRiskSchema(pool);
	await pool.end();
	console.log("risk migrations applied");
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	});
}
