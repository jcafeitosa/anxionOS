import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger } from "@anxionos/observability";
import type { Pool } from "pg";

const logger = createLogger({ service: "identity-migrate" });

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

export async function ensureIdentitySchema(pool: Pool): Promise<void> {
	const schemaSql = readFileSync(
		join(migrationsFolder, "0000_identity_schema.sql"),
		"utf8",
	);
	await pool.query(schemaSql);
}

const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
	const { Pool: PgPool } = await import("pg");
	const pool = new PgPool({ connectionString: databaseUrl });
	await ensureIdentitySchema(pool);
	await pool.end();
	logger.info("identity schema ensured");
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		logger.error("identity schema migration failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}
