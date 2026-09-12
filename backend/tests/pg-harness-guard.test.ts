/**
 * ANX-487 — acceptance tests for the shared PostgreSQL harness guard.
 *
 * These tests never touch a database: they exercise the decision function with
 * an injected environment and a fake pool, so the destructive path itself is
 * not needed to prove the refusal.
 */
import { describe, expect, test } from "bun:test";
import {
	isScratchDatabaseName,
	PROTECTED_DATABASES,
} from "../scripts/protected-databases";
import {
	assertDestructivePgTarget,
	getDatabaseUrl,
	readRunPgIntegrationTestsFlag,
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "./pg-harness-guard";

const SCRATCH_URL =
	"postgres://anxionos:anxionos@localhost:5432/anxionos_oracle";
const DEV_URL = "postgres://anxionos:anxionos@localhost:5432/anxionos";
const REMOTE_URL = "postgres://u:p@203.0.113.9:5432/prod";
const NON_SCRATCH_URL =
	"postgres://anxionos:anxionos@localhost:5432/some_app_db";

describe("shouldRunPgIntegrationTests — flag value", () => {
	test("(d) absent variable is a normal skip, even with a URL present", () => {
		expect(shouldRunPgIntegrationTests({ DATABASE_URL: SCRATCH_URL })).toBe(
			false,
		);
		expect(readRunPgIntegrationTestsFlag({})).toBe(false);
	});

	test("recognized falsy values disable the harness", () => {
		for (const value of ["false", "0", "no", "off", "", "  FALSE  "]) {
			expect(
				shouldRunPgIntegrationTests({
					RUN_PG_INTEGRATION_TESTS: value,
					DATABASE_URL: SCRATCH_URL,
				}),
			).toBe(false);
		}
	});

	test("recognized truthy values enable the harness (case-insensitive)", () => {
		for (const value of ["true", "1", "yes", "on", "TRUE", "Yes", "ON"]) {
			expect(
				shouldRunPgIntegrationTests({
					RUN_PG_INTEGRATION_TESTS: value,
					DATABASE_URL: SCRATCH_URL,
				}),
			).toBe(true);
		}
	});

	test("(a) a present but unrecognized value fails loudly", () => {
		for (const value of ["TRUE1", "enabled", "2", "y"]) {
			expect(() =>
				shouldRunPgIntegrationTests({
					RUN_PG_INTEGRATION_TESTS: value,
					DATABASE_URL: SCRATCH_URL,
				}),
			).toThrow(/unrecognized value/);
		}
	});
});

describe("shouldRunPgIntegrationTests — DATABASE_URL target", () => {
	test("missing URL with the flag on is an explicit error", () => {
		expect(() =>
			shouldRunPgIntegrationTests({ RUN_PG_INTEGRATION_TESTS: "true" }),
		).toThrow(/DATABASE_URL is required/);
	});

	test("malformed URL with the flag on is an explicit error", () => {
		expect(() =>
			shouldRunPgIntegrationTests({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: "not-a-url",
			}),
		).toThrow(/not a valid URL/);
		expect(() =>
			shouldRunPgIntegrationTests({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: "mysql://localhost:3306/foo_test",
			}),
		).toThrow(/postgres/);
	});

	test("(b) a non-loopback host is refused with an explicit message", () => {
		expect(() =>
			shouldRunPgIntegrationTests({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: REMOTE_URL,
			}),
		).toThrow(/non-loopback host "203\.0\.113\.9"/);
	});

	test("(b) the protected dev database is refused even on loopback", () => {
		expect(PROTECTED_DATABASES.has("anxionos")).toBe(true);
		expect(() =>
			shouldRunPgIntegrationTests({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: DEV_URL,
			}),
		).toThrow(/protected database "anxionos"/);
	});

	test("(b) a non-scratch database name is refused on loopback", () => {
		expect(() =>
			shouldRunPgIntegrationTests({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: NON_SCRATCH_URL,
			}),
		).toThrow(/documented test\/scratch name/);
	});

	test("(b) a protected name wins over the scratch prefix pattern", () => {
		expect(isScratchDatabaseName("anxionos_org")).toBe(true);
		expect(() =>
			shouldRunPgIntegrationTests({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL:
					"postgres://anxionos:anxionos@127.0.0.1:5432/anxionos_org",
			}),
		).toThrow(/protected database "anxionos_org"/);
	});

	test("(c) ALLOW_DESTRUCTIVE_TEST_DB=true releases an otherwise refused target", () => {
		expect(() =>
			assertDestructivePgTarget({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: REMOTE_URL,
				ALLOW_DESTRUCTIVE_TEST_DB: "true",
			}),
		).not.toThrow();
		expect(
			shouldRunPgIntegrationTests({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: REMOTE_URL,
				ALLOW_DESTRUCTIVE_TEST_DB: "1",
			}),
		).toBe(true);
	});

	test("the override is not released by a non-truthy value", () => {
		expect(() =>
			assertDestructivePgTarget({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: REMOTE_URL,
				ALLOW_DESTRUCTIVE_TEST_DB: "false",
			}),
		).toThrow(/non-loopback host/);
	});

	test("loopback aliases and scratch names are accepted", () => {
		for (const url of [
			"postgres://u:p@localhost:5432/anxionos_oracle",
			"postgres://u:p@127.0.0.1:5432/anxionos_oracle_neg",
			"postgres://u:p@[::1]:5432/anxionos_g5r4",
			"postgres://u:p@localhost:5432/my_app_test",
			"postgres://u:p@localhost:5432/my_app_wt",
			"postgres://u:p@localhost:5432/my_app_zero",
		]) {
			expect(
				shouldRunPgIntegrationTests({
					RUN_PG_INTEGRATION_TESTS: "true",
					DATABASE_URL: url,
				}),
			).toBe(true);
		}
	});

	test("(b) review databases held in PROTECTED_DATABASES are refused", () => {
		// Aligned with `scripts/fresh-db-oracle.mjs`: these names match the
		// scratch pattern but are reserved/held, so the guard refuses them.
		for (const name of ["anxionos_g3r2", "anxionos_g5r", "anxionos_org"]) {
			expect(() =>
				shouldRunPgIntegrationTests({
					RUN_PG_INTEGRATION_TESTS: "true",
					DATABASE_URL: `postgres://u:p@localhost:5432/${name}`,
				}),
			).toThrow(/protected database/);
		}
	});
});

describe("truncateDomainTables", () => {
	function createFakePool() {
		const calls: string[] = [];
		return {
			calls,
			pool: {
				async query(sql: string) {
					calls.push(sql);
					return { rows: [] };
				},
			},
		};
	}

	test("refuses and does not query when the flag is off", async () => {
		const { calls, pool } = createFakePool();
		await expect(truncateDomainTables(pool, "TRUNCATE x", {})).rejects.toThrow(
			/RUN_PG_INTEGRATION_TESTS is not enabled/,
		);
		expect(calls).toEqual([]);
	});

	test("refuses and does not query when the target is unsafe", async () => {
		const { calls, pool } = createFakePool();
		await expect(
			truncateDomainTables(pool, "TRUNCATE x", {
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: DEV_URL,
			}),
		).rejects.toThrow(/protected database "anxionos"/);
		expect(calls).toEqual([]);
	});

	test("executes exactly once after the guard passes", async () => {
		const { calls, pool } = createFakePool();
		await truncateDomainTables(pool, "TRUNCATE x", {
			RUN_PG_INTEGRATION_TESTS: "true",
			DATABASE_URL: SCRATCH_URL,
		});
		expect(calls).toEqual(["TRUNCATE x"]);
	});
});

describe("shared database-name source of truth", () => {
	test("getDatabaseUrl trims and treats blank as absent", () => {
		expect(getDatabaseUrl({ DATABASE_URL: "  postgres://x  " })).toBe(
			"postgres://x",
		);
		expect(getDatabaseUrl({ DATABASE_URL: "   " })).toBeUndefined();
	});

	test("never-protected names are rejected by the scratch classifier", () => {
		expect(isScratchDatabaseName("anxionos")).toBe(false);
		expect(isScratchDatabaseName("postgres")).toBe(false);
	});
});
