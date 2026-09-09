import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { IDENTITY_DDL } from "./schema-ddl";

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

export async function ensureIdentitySchema(pool: Pool): Promise<void> {
	// migrationsFolder owned by identity module (AR01); DDL bootstrap is idempotent.
	void migrationsFolder;
	await pool.query(IDENTITY_DDL);
}

const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
	const { Pool: PgPool } = await import("pg");
	const pool = new PgPool({ connectionString: databaseUrl });
	await ensureIdentitySchema(pool);
	await pool.end();
	console.log("identity schema ensured");
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	});
}
