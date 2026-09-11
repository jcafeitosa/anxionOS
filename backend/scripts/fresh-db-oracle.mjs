#!/usr/bin/env bun
/**
 * ANX-463 — fresh-database oracle.
 *
 * The regression this guards against: the suite only stayed green because it
 * ran against the long-lived `anxionos` dev database, whose schema drifted to
 * types/grants/columns that the committed migrations no longer produce. A brand
 * new database therefore failed (~86 failures) while the dev database passed.
 *
 * This oracle rebuilds the evidence path from zero:
 *   1. DROP + CREATE a dedicated scratch database;
 *   2. run `scripts/db-bootstrap.mjs` (roles/grants + all 23 module migrations);
 *   3. run the full suite with RUN_PG_INTEGRATION_TESTS=true against it;
 *   4. fail unless the summary is `0 fail` AND `0 skip`.
 *
 * Usage:
 *   bun run scripts/fresh-db-oracle.mjs                 # default db anxionos_oracle
 *   bun run scripts/fresh-db-oracle.mjs --json          # machine-readable summary
 *   bun run scripts/fresh-db-oracle.mjs --database anxionos_boot
 *   bun run scripts/fresh-db-oracle.mjs --keep          # do not drop the scratch db
 *
 * Connection source: ORACLE_ADMIN_DATABASE_URL, else DATABASE_URL, else the
 * local docker default. The database name in that URL is replaced by the
 * scratch name; the admin connection uses the `postgres` maintenance database.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createPgPool } from "@anxionos/eventing/postgres";

const BACKEND_ROOT = new URL("..", import.meta.url).pathname;
const DEFAULT_ADMIN_URL =
	"postgres://anxionos:anxionos@localhost:5432/anxionos";
const DEFAULT_SCRATCH_DB = "anxionos_oracle";

/** Databases this oracle must never drop — dev/shared/reserved per ANX-463. */
const PROTECTED_DATABASES = new Set([
	"postgres",
	"template0",
	"template1",
	"anxionos",
	"anxionos_g2r",
	"anxionos_g3r",
	"anxionos_g3r2",
	"anxionos_g4r",
	"anxionos_g5r",
	"anxionos_g5r2",
	"anxionos_org",
]);

/**
 * ANX-463 residual (reported, not masked): these modules expose an
 * `ensureXSchema` whose `migrations/` folder does not exist, so a fresh
 * database cannot create their tables. Any module NOT listed here that lands in
 * the same state fails the oracle. Removing a module from this list once its
 * migrations exist is safe.
 */
const KNOWN_MISSING_MIGRATIONS = new Set([
	"audit",
	"billing",
	"connections",
	"knowledge",
	"orchestration",
]);

function parseCli(argv) {
	return parseArgs({
		args: argv,
		options: {
			database: { type: "string" },
			json: { type: "boolean", default: false },
			keep: { type: "boolean", default: false },
		},
		allowPositionals: false,
	}).values;
}

export function resolveAdminUrl() {
	return (
		process.env.ORACLE_ADMIN_DATABASE_URL?.trim() ||
		process.env.DATABASE_URL?.trim() ||
		DEFAULT_ADMIN_URL
	);
}

function withDatabaseName(rawUrl, databaseName) {
	const url = new URL(rawUrl);
	url.pathname = `/${databaseName}`;
	return url.toString();
}

function quoteIdentifier(value) {
	return `"${value.replace(/"/g, '""')}"`;
}

async function recreateDatabase(adminUrl, scratchDb) {
	const adminPool = createPgPool(adminUrl);
	try {
		await adminPool.query(
			`DROP DATABASE IF EXISTS ${quoteIdentifier(scratchDb)} WITH (FORCE)`,
		);
		await adminPool.query(`CREATE DATABASE ${quoteIdentifier(scratchDb)}`);
	} finally {
		await adminPool.end();
	}
}

async function dropDatabase(adminUrl, scratchDb) {
	const adminPool = createPgPool(adminUrl);
	try {
		await adminPool.query(
			`DROP DATABASE IF EXISTS ${quoteIdentifier(scratchDb)} WITH (FORCE)`,
		);
	} finally {
		await adminPool.end();
	}
}

function runStep(command, args, env) {
	return spawnSync(command, args, {
		cwd: BACKEND_ROOT,
		env,
		encoding: "utf8",
		maxBuffer: 256 * 1024 * 1024,
	});
}

export function parseSuiteSummary(output) {
	const match = (pattern) => {
		const found = output.match(pattern);
		return found ? Number(found[1]) : undefined;
	};
	return {
		pass: match(/^\s*(\d+)\s+pass\b/m),
		fail: match(/^\s*(\d+)\s+fail\b/m),
		skip: match(/^\s*(\d+)\s+skip\b/m) ?? 0,
		total: match(/^Ran\s+(\d+)\s+tests?\b/m),
	};
}

async function main() {
	const cli = parseCli(process.argv.slice(2));
	const scratchDb = (cli.database ?? DEFAULT_SCRATCH_DB).trim();

	const adminUrl = resolveAdminUrl();
	const maintenanceUrl = withDatabaseName(adminUrl, "postgres");
	const scratchUrl = withDatabaseName(adminUrl, scratchDb);
	const env = {
		...process.env,
		DATABASE_URL: scratchUrl,
		RUN_PG_INTEGRATION_TESTS: "true",
	};

	const result = {
		issue: "ANX-463",
		database: scratchDb,
		ok: false,
		steps: {},
	};

	try {
		if (PROTECTED_DATABASES.has(scratchDb)) {
			throw new Error(
				`refusing to recreate protected database "${scratchDb}" — the oracle only runs on a scratch name`,
			);
		}
		await recreateDatabase(maintenanceUrl, scratchDb);
		result.steps.recreate = "ok";

		const bootstrap = runStep(
			"bun",
			["run", "scripts/db-bootstrap.mjs", "--json", "--allow-gaps"],
			env,
		);
		if (bootstrap.status !== 0) {
			throw new Error(
				`db-bootstrap failed (exit ${bootstrap.status}):\n${bootstrap.stdout}\n${bootstrap.stderr}`,
			);
		}
		result.steps.bootstrap = "ok";

		// Known ANX-463 residual: modules whose ensureXSchema has no versioned
		// migrations to apply. A NEW module landing in this list must fail the
		// oracle instead of silently bootstrapping an incomplete database.
		const bootstrapReport = JSON.parse(
			bootstrap.stdout.trim().split("\n").pop(),
		);
		result.bootstrapGaps = bootstrapReport.gaps.map((gap) => gap.name);
		result.unknownBootstrapGaps = result.bootstrapGaps.filter(
			(name) => !KNOWN_MISSING_MIGRATIONS.has(name),
		);
		if (result.unknownBootstrapGaps.length > 0) {
			throw new Error(
				`modules without versioned migrations (not in the known allowlist): ${result.unknownBootstrapGaps.join(", ")}`,
			);
		}

		const suite = runStep("bun", ["test", "--max-concurrency=1"], env);
		const output = `${suite.stdout ?? ""}${suite.stderr ?? ""}`;
		const logPath = join(tmpdir(), `anx463-fresh-db-${Date.now()}.log`);
		writeFileSync(logPath, output, "utf8");
		result.logPath = logPath;

		const summary = parseSuiteSummary(output);
		result.summary = summary;
		result.steps.suite = "ok";

		const ranIntegration =
			summary.total !== undefined && summary.pass !== undefined;
		result.ok =
			suite.status === 0 &&
			ranIntegration &&
			summary.fail === 0 &&
			summary.skip === 0 &&
			summary.pass > 0;

		if (!cli.json) {
			const tail = output.split("\n").slice(-25).join("\n");
			process.stderr.write(`${tail}\n`);
			process.stderr.write(`[fresh-db-oracle] full log: ${logPath}\n`);
		}
		if (!cli.keep) {
			await dropDatabase(maintenanceUrl, scratchDb).catch(() => {});
		}
	} catch (error) {
		result.error = error instanceof Error ? error.message : String(error);
	}

	if (cli.json) {
		console.log(JSON.stringify(result, null, 2));
	} else if (result.ok) {
		console.error(
			`[fresh-db-oracle] PASS — fresh database ${scratchDb}: ${result.summary.pass} pass / 0 fail / 0 skip`,
		);
	} else {
		const s = result.summary ?? {};
		console.error(
			`[fresh-db-oracle] FAIL — database ${scratchDb}: ${s.pass ?? "?"} pass / ${s.fail ?? "?"} fail / ${s.skip ?? "?"} skip${result.error ? ` (${result.error})` : ""}`,
		);
	}

	if (!result.ok) {
		process.exitCode = 1;
	}
}

if (import.meta.main) {
	await main();
}
