import { describe, expect, test } from "bun:test";
import { shouldRunPgIntegrationTests, withPgTestHarness } from "./test-support";

describe("postgresql pool tenant isolation", () => {
	test("RLS-02 sequential tenant contexts do not leak on pooled connections", async () => {
		await withPgTestHarness(async ({ pool, tenantA, tenantB }) => {
			await pool.withContext({ tenantId: tenantA }, async (client) => {
				await client.query(
					"INSERT INTO anxionos_tenant_records (tenant_id, label) VALUES ($1, $2)",
					[tenantA, "pool-leak-a"],
				);
			});

			await pool.withContext({ tenantId: tenantB }, async (client) => {
				const result = await client.query(
					"SELECT label FROM anxionos_tenant_records ORDER BY label",
				);
				expect(result.rows.map((row) => row.label)).toEqual([]);
			});

			await pool.withContext({ tenantId: tenantA }, async (client) => {
				const result = await client.query(
					"SELECT label FROM anxionos_tenant_records ORDER BY label",
				);
				expect(result.rows.map((row) => row.label)).toEqual(["pool-leak-a"]);
			});
		});
		if (!shouldRunPgIntegrationTests()) {
			expect(true).toBe(true);
		}
	});
});
