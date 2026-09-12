/**
 * ANX-487 — acceptance tests for the shared PostgreSQL harness guard.
 *
 * These tests never touch a database: they exercise the decision function with
 * an injected environment and a fake pool, so the destructive path itself is
 * not needed to prove the refusal.
 *
 * Round 2 adds the query-parameter probe table for the G2/G4 high finding: the
 * guard must validate the target the `pg` driver resolves, not the URL
 * authority.
 *
 * Round 3 adds the malformed-URL redaction table (whitespace, `@` inside the
 * password, `//`-less form) and the acceptance tests for `runGuardedSql`, the
 * guarded path used by the product-graph inbox reset.
 */
import { describe, expect, test } from "bun:test";
import {
	isScratchDatabaseName,
	PROTECTED_DATABASES,
	RESERVED_ENVIRONMENT_DATABASE_PATTERN,
} from "../scripts/protected-databases";
import {
	assertDestructivePgTarget,
	getDatabaseUrl,
	readRunPgIntegrationTestsFlag,
	redactCredentialFragment,
	redactDatabaseUrl,
	resolveEffectivePgTarget,
	runGuardedSql,
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "./pg-harness-guard";

const SCRATCH_URL =
	"postgres://anxionos:anxionos@localhost:5432/anxionos_oracle";
const DEV_URL = "postgres://anxionos:anxionos@localhost:5432/anxionos";
const REMOTE_URL = "postgres://u:p@203.0.113.9:5432/prod";
const NON_SCRATCH_URL =
	"postgres://anxionos:anxionos@localhost:5432/some_app_db";
const ENABLED = "true";

function enabled(url: string) {
	return { RUN_PG_INTEGRATION_TESTS: ENABLED, DATABASE_URL: url };
}

function captureError(run: () => unknown): string {
	try {
		run();
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	return "";
}

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
});

/**
 * ANX-487 round 2, finding 1 (HIGH): the guard must validate the target the
 * `pg` driver resolves. Each row asserts (i) the verdict and (ii) that the
 * accepted target is exactly the driver's target — "it did not throw" is not
 * evidence.
 */
describe("finding 1 — effective target resolved by the pg driver", () => {
	const cases: Array<{
		name: string;
		url: string;
		verdict: "accept" | "refuse";
		host: string;
		port: number;
		database: string;
		user?: string;
		password?: string;
	}> = [
		{
			name: "baseline (no query params)",
			url: "postgres://anxionos:anxionos@localhost:5432/anxionos_oracle",
			verdict: "accept",
			host: "localhost",
			port: 5432,
			database: "anxionos_oracle",
			user: "anxionos",
			password: "anxionos",
		},
		{
			name: "?host= remote (the reported bypass)",
			url: `${SCRATCH_URL}?host=203.0.113.9`,
			verdict: "refuse",
			host: "203.0.113.9",
			port: 5432,
			database: "anxionos_oracle",
		},
		{
			name: "?host= loopback is honoured and accepted",
			url: `${SCRATCH_URL}?host=127.0.0.1`,
			verdict: "accept",
			host: "127.0.0.1",
			port: 5432,
			database: "anxionos_oracle",
		},
		{
			name: "?%68ost= encoded key is decoded by the driver",
			url: `${SCRATCH_URL}?%68ost=203.0.113.9`,
			verdict: "refuse",
			host: "203.0.113.9",
			port: 5432,
			database: "anxionos_oracle",
		},
		{
			name: "?hostaddr= is NOT honoured by the JS driver",
			url: `${SCRATCH_URL}?hostaddr=203.0.113.9`,
			verdict: "accept",
			host: "localhost",
			port: 5432,
			database: "anxionos_oracle",
		},
		{
			name: "?port= overrides the authority port",
			url: `${SCRATCH_URL}?port=6000`,
			verdict: "accept",
			host: "localhost",
			port: 6000,
			database: "anxionos_oracle",
		},
		{
			name: "?dbname= is NOT honoured (pathname wins)",
			url: `${SCRATCH_URL}?dbname=anxionos_prod`,
			verdict: "accept",
			host: "localhost",
			port: 5432,
			database: "anxionos_oracle",
		},
		{
			name: "?database= is NOT honoured (pathname wins)",
			url: `${SCRATCH_URL}?database=anxionos_prod`,
			verdict: "accept",
			host: "localhost",
			port: 5432,
			database: "anxionos_oracle",
		},
		{
			name: "?user= overrides the URL user",
			url: `${SCRATCH_URL}?user=postgres`,
			verdict: "accept",
			host: "localhost",
			port: 5432,
			database: "anxionos_oracle",
			user: "postgres",
		},
		{
			name: "?password= overrides the URL password",
			url: `${SCRATCH_URL}?password=query-secret`,
			verdict: "accept",
			host: "localhost",
			port: 5432,
			database: "anxionos_oracle",
			password: "query-secret",
		},
		{
			name: "combined overrides move the target off loopback",
			url: `${SCRATCH_URL}?host=203.0.113.9&port=6000&dbname=x&database=y&user=u&password=p`,
			verdict: "refuse",
			host: "203.0.113.9",
			port: 6000,
			database: "anxionos_oracle",
			user: "u",
			password: "p",
		},
		{
			name: "combined loopback overrides keep host/port/user/password",
			url: `${SCRATCH_URL}?host=localhost&port=6000&user=u&password=p`,
			verdict: "accept",
			host: "localhost",
			port: 6000,
			database: "anxionos_oracle",
			user: "u",
			password: "p",
		},
		{
			name: "authority remote but ?host=loopback => driver goes local, accepted",
			url: "postgres://u:p@203.0.113.9:5432/anxionos_oracle?host=localhost",
			verdict: "accept",
			host: "localhost",
			port: 5432,
			database: "anxionos_oracle",
		},
		{
			name: "?host= moves a protected name out of danger (db still validated)",
			url: "postgres://u:p@localhost:5432/anxionos_prod?host=localhost",
			verdict: "refuse",
			host: "localhost",
			port: 5432,
			database: "anxionos_prod",
		},
	];

	for (const row of cases) {
		test(row.name, () => {
			const driverTarget = resolveEffectivePgTarget(row.url);
			expect(driverTarget.host).toBe(row.host);
			expect(driverTarget.port).toBe(row.port);
			expect(driverTarget.database).toBe(row.database);
			if (row.user !== undefined) {
				expect(driverTarget.user).toBe(row.user);
			}
			if (row.password !== undefined) {
				expect(driverTarget.password).toBe(row.password);
			}

			const env = enabled(row.url);
			if (row.verdict === "accept") {
				const validated = assertDestructivePgTarget(env);
				// The accepted target must be the validated target: same host,
				// port and database the driver will use.
				expect(validated).toEqual(driverTarget);
				expect(shouldRunPgIntegrationTests(env)).toBe(true);
			} else {
				expect(() => shouldRunPgIntegrationTests(env)).toThrow();
			}
		});
	}

	test("the exact G2/G4 bypass URL is refused and its driver target is remote", () => {
		const url = `${SCRATCH_URL}?host=203.0.113.9`;
		expect(resolveEffectivePgTarget(url).host).toBe("203.0.113.9");
		expect(() => shouldRunPgIntegrationTests(enabled(url))).toThrow(
			/non-loopback host "203\.0\.113\.9"/,
		);
	});

	test("an invalid ?port= value is refused with an explicit message", () => {
		expect(() =>
			shouldRunPgIntegrationTests(enabled(`${SCRATCH_URL}?port=abc`)),
		).toThrow(/invalid port/);
	});
});

describe("finding 3 — credentials are redacted from error messages", () => {
	const LEAKY_URL =
		"postgres://alice:S3cr3t-P4ssw0rd-DO-NOT-LEAK@localhost:99999/anxionos_oracle";

	test("the invalid-URL error never contains the password or the user", () => {
		const message = captureError(() =>
			shouldRunPgIntegrationTests({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: LEAKY_URL,
			}),
		);
		expect(message).toContain("not a valid URL");
		expect(message).toContain("***REDACTED***");
		expect(message).not.toContain("S3cr3t-P4ssw0rd-DO-NOT-LEAK");
		expect(message).not.toContain("alice");
	});

	test("the driver-resolution error is redacted too", () => {
		const url =
			"postgres://alice:S3cr3t-P4ssw0rd-DO-NOT-LEAK@localhost:5432/anxionos_oracle?sslcert=/no/such/anx487-cert.pem";
		const message = captureError(() =>
			shouldRunPgIntegrationTests(enabled(url)),
		);
		expect(message).toContain("could not be resolved by the pg driver");
		expect(message).not.toContain("S3cr3t-P4ssw0rd-DO-NOT-LEAK");
	});

	test("redactDatabaseUrl strips userinfo and secret query params", () => {
		const cases: Array<[string, string[]]> = [
			[
				"postgres://alice:S3cr3t-P4ssw0rd@localhost:5432/anxionos_oracle",
				["S3cr3t-P4ssw0rd", "alice"],
			],
			// Malformed: the password contains an unencoded `/`.
			[
				"postgres://alice:S3/cr3t@localhost:99999/anxionos_oracle",
				["S3/cr3t", "alice"],
			],
			[
				"postgres://localhost:5432/anxionos_oracle?password=query-secret",
				["query-secret"],
			],
			[
				"postgres://localhost:5432/anxionos_oracle?sslkey=/home/u/.pgkey",
				["/home/u/.pgkey"],
			],
		];
		for (const [url, secrets] of cases) {
			const redacted = redactDatabaseUrl(url);
			expect(redacted).toContain("***REDACTED***");
			for (const secret of secrets) {
				expect(redacted).not.toContain(secret);
			}
		}
	});
});

/**
 * ANX-487 round 3 — the three malformed forms the round-2 redaction missed.
 * Each row asserts the URL-level redaction; the `//`-less row also asserts the
 * refusal message, because that is where the raw `target.database` used to be
 * interpolated.
 */
describe("round 3 — credential redaction for malformed forms", () => {
	const MALFORMED: Array<{ name: string; url: string; secrets: string[] }> = [
		{
			name: "(a) password containing a space",
			url: "postgres://alice:p ss@localhost:5432/anxionos_oracle",
			secrets: ["p ss", "alice"],
		},
		{
			name: "(a) password containing a tab and a newline",
			url: "postgres://alice:p\tss\nword@localhost:5432/anxionos_oracle",
			secrets: ["p\tss\nword", "alice"],
		},
		{
			name: "(b) password containing an unescaped @ (the tail used to leak)",
			url: "postgres://alice:p@ss@localhost:99999/anxionos_oracle",
			secrets: ["p@ss", "ss@localhost", "alice"],
		},
		{
			name: "(c) //-less form, userinfo folded into the driver target",
			url: "postgres:alice:S3cr3t@localhost:5432/db",
			secrets: ["S3cr3t", "alice"],
		},
		{
			name: "(d) //-less form without @, userinfo folded into database",
			url: "postgres:alice:S3cr3t-DO-NOT-LEAK",
			secrets: ["S3cr3t-DO-NOT-LEAK", "alice"],
		},
		{
			name: "(e) authority without @, password-like fragment",
			url: "postgres://alice:S3cr3t-DO-NOT-LEAK",
			secrets: ["S3cr3t-DO-NOT-LEAK", "alice"],
		},
	];

	for (const row of MALFORMED) {
		test(`${row.name} — redactDatabaseUrl leaves no credential`, () => {
			const redacted = redactDatabaseUrl(row.url);
			expect(redacted).toContain("***REDACTED***");
			for (const secret of row.secrets) {
				expect(redacted).not.toContain(secret);
			}
		});
	}

	test("(c) the guard refusal for the //-less form never prints the userinfo", () => {
		const message = captureError(() =>
			shouldRunPgIntegrationTests({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: "postgres:alice:S3cr3t@localhost:5432/db",
			}),
		);
		expect(message).toMatch(/refusing to TRUNCATE/);
		expect(message).toContain("***REDACTED***");
		expect(message).not.toContain("S3cr3t");
		expect(message).not.toContain("alice");
	});

	/**
	 * ANX-487 round 4 — the exact repro G4 reported. A `//`-less URL **without**
	 * `@` makes the driver fold the userinfo into `database`, and the refusal
	 * message interpolates that resolved database. The round-3 rule only handled
	 * fragments that contain `@`, so the password was printed in full:
	 *   `refusing to TRUNCATE database "lice:S3cr3t-DO-NOT-LEAK": ...`
	 */
	test("(d) the refusal for the //-less form WITHOUT @ never prints the password", () => {
		const message = captureError(() =>
			shouldRunPgIntegrationTests({
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: "postgres:alice:S3cr3t-DO-NOT-LEAK",
			}),
		);
		expect(message).toMatch(/refusing to TRUNCATE/);
		expect(message).toContain("***REDACTED***");
		expect(message).not.toContain("S3cr3t-DO-NOT-LEAK");
		expect(message).not.toContain("alice");
		expect(message).not.toContain("lice:");
	});

	test("redactCredentialFragment is an allowlist: only plain identifiers survive", () => {
		// Round 4 — any fragment that is not a plain identifier (or IPv6 literal)
		// is replaced wholesale. A `user[:password]@host` fragment cannot be a
		// database name or host, so nothing of it is printed.
		expect(redactCredentialFragment("lice:p@ss@localhost:5432/db")).toBe(
			"***REDACTED***",
		);
		expect(redactCredentialFragment("lice:S3cr3t@localhost:5432/db")).toBe(
			"***REDACTED***",
		);
		// Round-4 leak: the //-less form the driver folds into `database`.
		expect(redactCredentialFragment("lice:S3cr3t-DO-NOT-LEAK")).toBe(
			"***REDACTED***",
		);
		// Legitimate identifiers are preserved verbatim.
		expect(redactCredentialFragment("anxionos_oracle")).toBe("anxionos_oracle");
		expect(redactCredentialFragment("anxionos_g2r487d")).toBe(
			"anxionos_g2r487d",
		);
		expect(redactCredentialFragment("localhost")).toBe("localhost");
		expect(redactCredentialFragment("127.0.0.1")).toBe("127.0.0.1");
		expect(redactCredentialFragment("[::1]")).toBe("[::1]");
		expect(redactCredentialFragment("::1")).toBe("::1");
		expect(redactCredentialFragment("")).toBe("");
	});
});

/**
 * ANX-487 round 3 — `runGuardedSql` is the sanctioned path for the
 * parameterized `DELETE` of the product-graph inbox reset. It must keep the
 * round-2 TRUNCATE/DELETE-only guarantee (no DDL) and revalidate flag/target.
 */
describe("round 3 — runGuardedSql for parameterized fixture cleanup", () => {
	function createFakePool() {
		const calls: Array<{ sql: string; params?: unknown[] }> = [];
		return {
			calls,
			pool: {
				async query(sql: string, params?: unknown[]) {
					calls.push({ sql, params });
					return { rows: [] };
				},
			},
		};
	}

	test("executes a parameterized DELETE on an approved target", async () => {
		const { calls, pool } = createFakePool();
		const sql =
			"DELETE FROM graph_projection_inbox WHERE consumer_name = ANY($1)";
		const params = [["graph:product:v1"]];
		await runGuardedSql(pool, sql, params, enabled(SCRATCH_URL));
		expect(calls).toEqual([{ sql, params }]);
	});

	test("refuses and does not query when the flag is off", async () => {
		const { calls, pool } = createFakePool();
		await expect(
			runGuardedSql(pool, "DELETE FROM graph_projection_inbox", [], {}),
		).rejects.toThrow(/RUN_PG_INTEGRATION_TESTS is not enabled/);
		expect(calls).toEqual([]);
	});

	test("refuses and does not query on an unsafe target", async () => {
		const { calls, pool } = createFakePool();
		await expect(
			runGuardedSql(pool, "DELETE FROM graph_projection_inbox", [], {
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: DEV_URL,
			}),
		).rejects.toThrow(/protected database "anxionos"/);
		expect(calls).toEqual([]);
	});

	test("refuses DDL and multi-statement payloads on an approved target", async () => {
		for (const sql of [
			"DROP DATABASE anxionos_oracle",
			"ALTER TABLE graph_projection_inbox DROP COLUMN x",
			"DELETE FROM graph_projection_inbox; DROP DATABASE anxionos_oracle",
			"SELECT 1",
			"",
		]) {
			const { calls, pool } = createFakePool();
			await expect(
				runGuardedSql(pool, sql, [], enabled(SCRATCH_URL)),
			).rejects.toThrow(/non-cleanup statement/);
			expect(calls).toEqual([]);
		}
	});
});

describe("finding 5 — truncateDomainTables is TRUNCATE-only", () => {
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

	test("refuses a non-TRUNCATE statement even on an approved target", async () => {
		for (const sql of [
			"DROP DATABASE anxionos_oracle",
			"DELETE FROM organizations_owners",
			"TRUNCATE organizations_owners; DROP DATABASE anxionos_oracle",
			"TRUNCATED organizations_owners",
			"",
		]) {
			const { calls, pool } = createFakePool();
			await expect(
				truncateDomainTables(pool, sql, enabled(SCRATCH_URL)),
			).rejects.toThrow(/non-TRUNCATE statement/);
			expect(calls).toEqual([]);
		}
	});

	test("executes exactly once after the guard passes", async () => {
		const { calls, pool } = createFakePool();
		await truncateDomainTables(pool, "TRUNCATE x", enabled(SCRATCH_URL));
		expect(calls).toEqual(["TRUNCATE x"]);
	});

	test("accepts a single trailing semicolon and multi-line statements", async () => {
		for (const sql of [
			"TRUNCATE a, b RESTART IDENTITY CASCADE;",
			"\nTRUNCATE\n\ta,\n\tb CASCADE\n",
		]) {
			const { calls, pool } = createFakePool();
			await truncateDomainTables(pool, sql, enabled(SCRATCH_URL));
			expect(calls).toEqual([sql]);
		}
	});
});

describe("finding 2/4 — database-name conventions", () => {
	test("gate/oracle scratch names used in this session are accepted", () => {
		for (const name of [
			"anxionos_g2r477",
			"anxionos_g3_460",
			"anxionos_g5r_460",
			"anxionos_anx487",
			"anxionos_oracle",
			"anxionos_oracle_neg",
			"anxionos_g2r487",
			"anxionos_g3r2",
			"anxionos_g4_rev2",
			"anxionos_boot",
			"my_app_test",
			"my_app_wt",
			"my_app_zero",
		]) {
			expect(isScratchDatabaseName(name)).toBe(true);
		}
	});

	test("environment-looking names are refused by the classifier", () => {
		for (const name of [
			"anxionos_prod",
			"anxionos_production",
			"anxionos_staging",
			"anxionos_stage2",
			"anxionos_prod2",
			"anxionos_production2",
			"anxionos_staging_eu",
			"anxionos_live",
			"ANXIONOS_prod",
			"ANXIONOS_PRODUCTION",
			"my_prod_test",
			"anxionos_provision",
		]) {
			if (name === "anxionos_provision") {
				// Not an environment segment: `provision` must not be a false
				// positive of the `prod` prefix rule.
				expect(RESERVED_ENVIRONMENT_DATABASE_PATTERN.test(name)).toBe(false);
				expect(isScratchDatabaseName(name)).toBe(true);
				continue;
			}
			expect(RESERVED_ENVIRONMENT_DATABASE_PATTERN.test(name)).toBe(true);
			expect(isScratchDatabaseName(name)).toBe(false);
		}
	});

	test("the guard refuses prod/production/staging targets", () => {
		for (const name of [
			"anxionos_prod",
			"anxionos_production",
			"anxionos_staging",
			"ANXIONOS_prod",
		]) {
			const env = enabled(`postgres://u:p@localhost:5432/${name}`);
			const message = captureError(() => shouldRunPgIntegrationTests(env));
			expect(message).toMatch(/protected database|documented test\/scratch/);
		}
	});

	test("finding 4 — protected lookup is case-insensitive", () => {
		expect(PROTECTED_DATABASES.has("anxionos_org")).toBe(true);
		for (const name of ["ANXIONOS_ORG", "ANXIONOS_G3R", "Anxionos_Org"]) {
			const env = enabled(`postgres://u:p@localhost:5432/${name}`);
			expect(() => shouldRunPgIntegrationTests(env)).toThrow(
				/protected database/,
			);
		}
	});

	test("bare dev/other names are still refused", () => {
		for (const name of ["anxionos", "postgres", "some_app_db"]) {
			expect(isScratchDatabaseName(name)).toBe(false);
		}
	});
});

describe("shared database-name source of truth", () => {
	test("getDatabaseUrl trims and treats blank as absent", () => {
		expect(getDatabaseUrl({ DATABASE_URL: "  postgres://x  " })).toBe(
			"postgres://x",
		);
		expect(getDatabaseUrl({ DATABASE_URL: "   " })).toBeUndefined();
	});
});

/**
 * ANX-487 round 5 — G2 and G4 independently found that round 4 still leaked in
 * refusal messages for attacker-controlled `database`/`host` values that pass
 * the character allowlist, and in `redactDatabaseUrl` for path/query values.
 * The rule is now: never print a derived value unless its safety is established
 * by the target policy (loopback/IP-literal host, known scratch/protected
 * database name); redact a bare URL without a scheme wholesale; redact every
 * query-parameter value.
 */
describe("round 5 — fail-closed redaction of derived values", () => {
	/** Substrings whose appearance in a message is a leak. */
	const LEAK_MARKERS = [
		"S3cr3t-DO-NOT-LEAK",
		"S3cr3t",
		"p@ss",
		"p ss",
		"pw",
		"alice",
		"lice:",
		"lice.",
		"lice-",
		"lice_",
		"alice:",
	];

	// Refusal-path repros: each URL is malformed/password-shaped, the guard must
	// refuse AND the message must not contain any fragment of the credential.
	const REFUSAL_CASES: Array<{ name: string; url: string }> = [
		// G2 (round 5) — the two HIGH repros of this round.
		{
			name: "path carrying a password",
			url: "postgres://localhost:5432/S3cr3t-DO-NOT-LEAK",
		},
		{
			name: "path carrying a password with userinfo",
			url: "postgres://alice:pw@localhost:5432/S3cr3t-DO-NOT-LEAK",
		},
		// G4 (round 4) — fresh FUROs that the round-4 allowlist let through.
		{
			name: "@DO-NOT-LEAK folds database to the user",
			url: "postgres://alice:S3cr3t@DO-NOT-LEAK",
		},
		{ name: "//-less with dot", url: "postgres:alice.S3cr3t-DO-NOT-LEAK" },
		{ name: "authority with dot", url: "postgres://alice.S3cr3t-DO-NOT-LEAK" },
		{ name: "//-less with hyphen", url: "postgres:alice-S3cr3t-DO-NOT-LEAK" },
		{
			name: "//-less with underscore",
			url: "postgres:alice_S3cr3t-DO-NOT-LEAK",
		},
		{ name: "scheme shaped like a userinfo", url: "alice:S3cr3t" },
		// Rounds 2/3 cases that must keep being closed.
		{
			name: "password with a space",
			url: "postgres://alice:p ss@localhost:99999/anxionos_oracle",
		},
		{
			name: "unescaped @ in password",
			url: "postgres://alice:p@ss@localhost:99999/anxionos_oracle",
		},
		{ name: "//-less with @", url: "postgres:alice:S3cr3t@localhost:5432/db" },
		{ name: "authority without @", url: "postgres://alice:S3cr3t-DO-NOT-LEAK" },
	];

	for (const row of REFUSAL_CASES) {
		test(`${row.name} — refusal message never prints a credential fragment`, () => {
			const message = captureError(() =>
				shouldRunPgIntegrationTests(enabled(row.url)),
			);
			expect(message).not.toBe("");
			expect(message).toMatch(/refusing|not a valid URL|protocol/);
			for (const marker of LEAK_MARKERS) {
				expect(message.toLowerCase()).not.toContain(marker.toLowerCase());
			}
		});
	}

	test("a hostname-shaped non-loopback host is NOT printed; an IP literal is", () => {
		const hostname = captureError(() =>
			shouldRunPgIntegrationTests(
				enabled("postgres://u:p@alice.s3cr3t-do-not-leak:5432/anxionos_oracle"),
			),
		);
		expect(hostname).toMatch(/non-loopback host "\*\*\*REDACTED\*\*\*"/);
		expect(hostname.toLowerCase()).not.toContain("alice.s3cr3t-do-not-leak");

		const ipv4 = captureError(() =>
			shouldRunPgIntegrationTests(enabled(REMOTE_URL)),
		);
		expect(ipv4).toMatch(/non-loopback host "203\.0\.113\.9"/);
	});

	test("a known IP-literal host and a known scratch database stay readable", () => {
		const message = captureError(() =>
			shouldRunPgIntegrationTests(
				enabled("postgres://u:p@203.0.113.9:5432/anxionos_oracle"),
			),
		);
		expect(message).toContain("203.0.113.9");
		expect(message).toContain("anxionos_oracle");
	});

	test("the protocol refusal does not echo the offending scheme", () => {
		const message = captureError(() =>
			shouldRunPgIntegrationTests(enabled("alice:S3cr3t")),
		);
		expect(message).toMatch(/postgres:\/\/ or postgresql:\/\//);
		expect(message).not.toContain("alice");
		expect(message).not.toContain("S3cr3t");
	});

	test("redactDatabaseUrl redacts a bare identifier and path/query values", () => {
		expect(redactDatabaseUrl("S3cr3t-DO-NOT-LEAK")).toBe("***REDACTED***");

		const withPath = redactDatabaseUrl(
			"postgres://localhost:5432/S3cr3t-DO-NOT-LEAK",
		);
		expect(withPath).not.toContain("S3cr3t-DO-NOT-LEAK");
		expect(withPath).toContain("localhost:5432");

		const withQuery = redactDatabaseUrl(
			"postgres://localhost:5432/anxionos_oracle?user=SECRET&sslcert=/x/y.pem",
		);
		expect(withQuery).toContain("anxionos_oracle");
		expect(withQuery).not.toContain("SECRET");
		expect(withQuery).not.toContain("/x/y.pem");
		expect(withQuery).not.toContain("user=SECRET");

		// Known scratch names in the path stay readable (diagnostic preserved).
		const scratch = redactDatabaseUrl(
			"postgres://localhost:5432/anxionos_oracle",
		);
		expect(scratch).toContain("anxionos_oracle");
	});
});
