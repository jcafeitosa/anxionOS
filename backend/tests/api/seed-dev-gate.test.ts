import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertDevSeedAllowed } from "../../apps/api/src/auth/seed-dev";

describe("seed:dev gate", () => {
	test("refuses production", () => {
		expect(() =>
			assertDevSeedAllowed({ NODE_ENV: "production", ALLOW_DEV_SEED: "true" }),
		).toThrow(/blocked in production/);
	});

	test("refuses missing ALLOW_DEV_SEED", () => {
		expect(() => assertDevSeedAllowed({ NODE_ENV: "development" })).toThrow(
			/ALLOW_DEV_SEED/,
		);
	});

	test("allows explicit dev flag", () => {
		expect(() =>
			assertDevSeedAllowed({ NODE_ENV: "development", ALLOW_DEV_SEED: "true" }),
		).not.toThrow();
	});
});

describe("organizations drizzle journal", () => {
	test("meta/_journal.json lists every SQL migration", () => {
		const folder = join(
			dirname(fileURLToPath(import.meta.url)),
			"../../modules/organizations/src/infrastructure/migrations",
		);
		const journal = JSON.parse(
			readFileSync(join(folder, "meta/_journal.json"), "utf8"),
		) as { entries: Array<{ tag: string }> };
		const sqls = readdirSync(folder)
			.filter((name) => name.endsWith(".sql"))
			.sort();
		expect(journal.entries.map((entry) => `${entry.tag}.sql`)).toEqual(sqls);
	});
});
