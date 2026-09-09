import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function ensureGovernanceSchema(pool: Pool): Promise<void> {
	const db = drizzle(pool);
	await migrate(db, { migrationsFolder });
}

const databaseUrl =
	process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main() {
	const { Pool } = await import("pg");
	const pool = new Pool({ connectionString: databaseUrl });
	await ensureGovernanceSchema(pool);
	await pool.end();
	console.log("governance migrations applied");
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
