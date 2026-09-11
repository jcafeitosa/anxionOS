#!/usr/bin/env bun
/**
 * ANX-154 S5 — graph convergence oracle homologation.
 *
 * Validates PG authoritative performance metrics match graph projection
 * rebuilt from domain_journal events.
 *
 * Importers: `bun run scripts/anx154-graph-oracle.mjs`
 * Requires: DATABASE_URL + RUN_PG_INTEGRATION_TESTS=true
 */
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const BACKEND_ROOT = new URL("..", import.meta.url).pathname;

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string", default: "ANX-154" },
			json: { type: "boolean", default: false },
		},
		allowPositionals: false,
	});
	return values;
}

function main() {
	const cli = parseCli(process.argv.slice(2));
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		const message = "DATABASE_URL is required for ANX-154 graph oracle";
		if (cli.json) {
			console.log(
				JSON.stringify({ issue: cli.issue, ok: false, error: message }),
			);
		} else {
			console.error(message);
		}
		process.exit(1);
	}

	const result = spawnSync(
		"bun",
		[
			"test",
			"tests/graph/performance-graph-projector.test.ts",
			"tests/performance/integration/graph-convergence-oracle.test.ts",
			"--max-concurrency=1",
		],
		{
			cwd: BACKEND_ROOT,
			env: {
				...process.env,
				RUN_PG_INTEGRATION_TESTS: "true",
				DATABASE_URL: databaseUrl,
			},
			encoding: "utf8",
		},
	);

	const ok = result.status === 0;
	const report = {
		issue: cli.issue,
		ok,
		command:
			"RUN_PG_INTEGRATION_TESTS=true bun test tests/performance/integration/graph-convergence-oracle.test.ts",
		exitCode: result.status ?? 1,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};

	if (cli.json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		if (report.stdout) process.stdout.write(report.stdout);
		if (report.stderr) process.stderr.write(report.stderr);
		if (!ok) {
			console.error(`ANX-154 graph oracle FAILED (exit ${report.exitCode})`);
		} else {
			console.log("ANX-154 graph oracle PASS");
		}
	}

	process.exit(ok ? 0 : 1);
}

main();
