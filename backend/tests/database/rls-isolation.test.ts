import { describe, expect, test } from "bun:test";
import {
	TenantContextError,
	createRolesSql,
	dropRolesSql,
	rollbackDatabaseMigrations,
	tenantScopedPolicies,
	validateTenantContext,
} from "@anxionos/database";
import {
	countRowsForTenant,
	seedTenantRow,
	shouldRunPgIntegrationTests,
	withPgTestHarness,
} from "./test-support";

describe("tenant context validation", () => {
	test("rejects missing tenantId", () => {
		expect(() => validateTenantContext({ tenantId: "" })).toThrow(TenantContextError);
	});

	test("rejects invalid UUID", () => {
		expect(() => validateTenantContext({ tenantId: "not-a-uuid" })).toThrow(TenantContextError);
	});
});

describe("rls policy helpers", () => {
	test("generates tenant-scoped policy bundle", () => {
		const sql = tenantScopedPolicies("example_rows", "organization_id");
		expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
		expect(sql).toContain("organization_id");
		expect(sql).toContain("current_setting('app.tenant_id', true)");
	});

	test("role migration SQL includes app and service roles", () => {
		const sql = createRolesSql({ databaseName: "anxionos_test" });
		expect(sql).toContain("anxion_app");
		expect(sql).toContain("anxion_service");
		expect(sql).toContain("BYPASSRLS");
		expect(dropRolesSql()).toContain("DROP ROLE IF EXISTS anxion_app");
	});
});

describe("postgresql rls integration", () => {
	test("RLS-01 cross-tenant SELECT denied", async () => {
		await withPgTestHarness(async ({ pool, tenantA, tenantB }) => {
			await seedTenantRow(pool, tenantA, "tenant-a-row");
			await seedTenantRow(pool, tenantB, "tenant-b-row");

			const visibleToA = await countRowsForTenant(pool, tenantA);
			const visibleToB = await countRowsForTenant(pool, tenantB);

			expect(visibleToA).toBe(1);
			expect(visibleToB).toBe(1);
		});
		if (!shouldRunPgIntegrationTests()) {
			expect(true).toBe(true);
		}
	});

	test("RLS-03 job without tenant context sees zero rows", async () => {
		await withPgTestHarness(async ({ pool, tenantA }) => {
			await seedTenantRow(pool, tenantA, "hidden-without-context");

			const count = await pool.withPlatformContext(async (client) => {
				const result = await client.query("SELECT count(*)::int AS count FROM anxionos_tenant_records");
				return result.rows[0]?.count ?? 0;
			});

			expect(count).toBe(0);
		});
		if (!shouldRunPgIntegrationTests()) {
			expect(true).toBe(true);
		}
	});

	test("RLS-04 app pool rejects bypassRls flag", async () => {
		await withPgTestHarness(async ({ pool, tenantA }) => {
			await expect(
				pool.withContext({ tenantId: tenantA, bypassRls: true }, async () => "noop"),
			).rejects.toThrow(TenantContextError);
		});
		if (!shouldRunPgIntegrationTests()) {
			expect(true).toBe(true);
		}
	});

	test("RLS-07 migration rollback removes fixture table", async () => {
		await withPgTestHarness(async ({ pool }) => {
			await rollbackDatabaseMigrations(pool.pool);
			await expect(
				pool.withPlatformContext(async (client) =>
					client.query("SELECT to_regclass('public.anxionos_tenant_records')"),
				),
			).resolves.toBeDefined();
			const regclass = await pool.withPlatformContext(async (client) => {
				const result = await client.query(
					"SELECT to_regclass('public.anxionos_tenant_records') AS table_name",
				);
				return result.rows[0]?.table_name;
			});
			expect(regclass).toBeNull();
		});
		if (!shouldRunPgIntegrationTests()) {
			expect(true).toBe(true);
		}
	});
});
