import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger } from "@anxionos/observability";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

const logger = createLogger({ service: "market-data-migrate" });

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

// Migration tracking is scoped to a market-data-owned schema/table
// (ADR0002 per-module ownership), not drizzle's default
// `drizzle.__drizzle_migrations`. That default table is shared across every
// module using this same migrator helper (organizations, agents, ...): its
// "has a later migration already run" guard compares against the single
// most-recent row regardless of which module wrote it, so a module whose own
// migration folder has an earlier `when` timestamp than another module's
// last-applied entry gets silently skipped — no error, no rows changed.
// Found while landing ANX-145: this file's own migration ran "successfully"
// against the shared table without ever executing. Isolating the tracking
// table per module removes the cross-module race entirely.
export async function ensureMarketDataSchema(pool: Pool): Promise<void> {
	const db = drizzle(pool);
	await migrate(db, {
		migrationsFolder,
		migrationsSchema: "market_data",
		migrationsTable: "__drizzle_migrations",
	});
}

const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
	const { Pool: PgPool } = await import("pg");
	const pool = new PgPool({ connectionString: databaseUrl });
	await ensureMarketDataSchema(pool);
	await pool.end();
	logger.info("market-data migrations applied");
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		logger.error("market-data schema migration failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}
