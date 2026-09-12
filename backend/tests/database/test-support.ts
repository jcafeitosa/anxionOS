import {
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

export { shouldRunPgIntegrationTests } from "../pg-harness-guard";

import {
	createScopedPool,
	rollbackDatabaseMigrations,
	runDatabaseMigrations,
} from "@anxionos/database";

export const FIXTURE_TABLE = "anxionos_tenant_records";

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export async function withPgTestHarness<T>(
	work: (ctx: {
		pool: ReturnType<typeof createScopedPool>;
		tenantA: string;
		tenantB: string;
	}) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const tenantA = "11111111-1111-4111-8111-111111111111";
	const tenantB = "22222222-2222-4222-8222-222222222222";
	const pool = createScopedPool({ connectionString: url, max: 4 });

	try {
		await runDatabaseMigrations(pool.pool, {
			includeRoles: true,
			rolePassword:
				process.env.DATABASE_ROLE_PASSWORD ?? "change-me-in-production",
		});
		await truncateDomainTables(pool.pool, `TRUNCATE ${FIXTURE_TABLE}`);
		return await work({ pool, tenantA, tenantB });
	} finally {
		try {
			await rollbackDatabaseMigrations(pool.pool);
		} catch {
			// best-effort cleanup for shared dev databases
		}
		await pool.end();
	}
}

export async function seedTenantRow(
	pool: ReturnType<typeof createScopedPool>,
	tenantId: string,
	label: string,
): Promise<void> {
	await pool.withContext({ tenantId }, async (client) => {
		await client.query(
			`INSERT INTO ${FIXTURE_TABLE} (tenant_id, label) VALUES ($1, $2)`,
			[tenantId, label],
		);
	});
}

export async function countRowsForTenant(
	pool: ReturnType<typeof createScopedPool>,
	tenantId: string,
): Promise<number> {
	return pool.withContext({ tenantId }, async (client) => {
		const result = await client.query(
			`SELECT count(*)::int AS count FROM ${FIXTURE_TABLE}`,
		);
		return result.rows[0]?.count ?? 0;
	});
}
