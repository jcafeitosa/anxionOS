import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger } from "@anxionos/observability";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

const logger = createLogger({ service: "identity-migrate" });

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

/**
 * Applies the versioned identity migrations through the Drizzle migrator,
 * matching the other 21 modules. The journal is isolated in the `identity`
 * schema so concurrent module migrators cannot observe each other's rows.
 */
export async function ensureIdentitySchema(pool: Pool): Promise<void> {
	const db = drizzle(pool);
	await migrate(db, {
		migrationsFolder,
		migrationsSchema: "identity",
		migrationsTable: "__drizzle_migrations",
	});
}

async function main(): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required to run identity migrations");
	}
	const { Pool: PgPool } = await import("pg");
	const pool = new PgPool({ connectionString: databaseUrl });
	try {
		await ensureIdentitySchema(pool);
	} finally {
		await pool.end();
	}
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
