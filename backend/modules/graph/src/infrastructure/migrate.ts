import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);
export async function ensureGraphSchema(pool) {
	const db = drizzle(pool);
	// Journal isolado no schema `graph`: sem isso, módulos que usam o schema
	// `drizzle` compartilham `__drizzle_migrations` e um pode considerar a
	// migração do outro já aplicada (mesmo padrão adotado em identity).
	await migrate(db, {
		migrationsFolder,
		migrationsSchema: "graph",
		migrationsTable: "__drizzle_migrations",
	});
}
const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://anxionos:anxionos@localhost:5432/anxionos";
async function main() {
	const { Pool } = await import("pg");
	const pool = new Pool({ connectionString: databaseUrl });
	await ensureGraphSchema(pool);
	await pool.end();
	console.log("graph migrations applied");
}
if (import.meta.main) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
