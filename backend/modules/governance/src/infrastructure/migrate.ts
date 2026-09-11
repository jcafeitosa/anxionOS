import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger } from "@anxionos/observability";
import type { Pool } from "pg";

const logger = createLogger({ service: "governance-migrate" });

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

async function applyMigrationFile(pool: Pool, filename: string): Promise<void> {
	const sql = readFileSync(join(migrationsFolder, filename), "utf8");
	try {
		await pool.query(sql);
	} catch (error) {
		const code =
			error && typeof error === "object" && "code" in error
				? String(error.code)
				: "";
		// 42710 = duplicate_object (policy/type), 42P07 = duplicate_table
		if (code === "42710" || code === "42P07") {
			logger.info("governance migration already applied", { filename, code });
			return;
		}
		throw error;
	}
}

export async function ensureGovernanceSchema(pool: Pool): Promise<void> {
	await applyMigrationFile(pool, "0000_governance_core.sql");
	await applyMigrationFile(pool, "0001_governance_rls_columns.sql");
	await applyMigrationFile(pool, "0002_governance_rls_policies.sql");
	await applyMigrationFile(pool, "0003_governance_delegations.sql");
	await applyMigrationFile(pool, "0004_governance_mandates.sql");
	await applyMigrationFile(pool, "0005_governance_autonomy.sql");
	await applyMigrationFile(pool, "0006_governance_autonomy_unique_active.sql");
	await applyMigrationFile(pool, "0007_governance_autonomy_drop_dup_idx.sql");
	await applyMigrationFile(pool, "0008_governance_platform_scope.sql");
	await applyMigrationFile(pool, "0009_governance_grant_issuer.sql");
	await applyMigrationFile(
		pool,
		"0010_governance_remove_organization_scope.sql",
	);
}

const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
	const { Pool: PgPool } = await import("pg");
	const pool = new PgPool({ connectionString: databaseUrl });
	await ensureGovernanceSchema(pool);
	await pool.end();
	logger.info("governance migrations applied");
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		logger.error("governance schema migration failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}
