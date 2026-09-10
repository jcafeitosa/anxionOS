#!/usr/bin/env bun
/**
 * ANX-304 — P4 Neo4j rebuild homologation report.
 *
 * Runs unit tests for full-generation-swap and optional live Neo4j rebuild replay tests.
 */
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string", default: "ANX-304" },
			json: { type: "boolean", default: false },
		},
		allowPositionals: false,
	});
	return values;
}

function run(command, args, env = {}) {
	const result = spawnSync(command, args, {
		cwd: new URL("../..", import.meta.url).pathname,
		env: { ...process.env, ...env },
		encoding: "utf8",
	});
	return {
		ok: result.status === 0,
		status: result.status ?? 1,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

async function main() {
	const opts = parseCli(process.argv.slice(2));
	const report = {
		issue: opts.issue,
		timestamp: new Date().toISOString(),
		unitTests: { ok: false },
		neo4j: { profile: "graph-sandbox", ok: false },
		graphTests: { ok: false },
	};

	const unit = run("bun", [
		"test",
		"backend/tests/graph/full-generation-swap.test.ts",
		"backend/tests/graph/neo4j-rebuild-homologation.integration.test.ts",
	]);
	report.unitTests = { ok: unit.ok, exitCode: unit.status };

	const compose = run("docker-compose", [
		"-f",
		"backend/deploy/docker/docker-compose.yml",
		"--profile",
		"graph-sandbox",
		"ps",
		"--services",
		"--filter",
		"status=running",
	]);
	report.neo4j.composeOk = compose.ok;
	report.neo4j.runningServices = compose.stdout
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	report.neo4j.ok = report.neo4j.runningServices.includes("neo4j");

	const graphTests = run(
		"bun",
		["test", "backend/tests/graph/neo4j-rebuild-homologation.integration.test.ts"],
		{
			RUN_NEO4J_INTEGRATION_TESTS: "true",
			NEO4J_URI: process.env.NEO4J_URI ?? "bolt://localhost:7687",
			NEO4J_USER: process.env.NEO4J_USER ?? "neo4j",
			NEO4J_PASSWORD: process.env.NEO4J_PASSWORD ?? "anxionos",
		},
	);
	report.graphTests = {
		ok: graphTests.ok,
		exitCode: graphTests.status,
	};

	report.overallOk = Boolean(report.unitTests.ok);

	if (opts.json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(`P4 rebuild homologation — ${opts.issue}`);
		console.log(`Unit tests: ${report.unitTests.ok ? "pass" : "fail"}`);
		console.log(`Neo4j running: ${report.neo4j.ok ? "yes" : "no"}`);
		console.log(
			`Neo4j rebuild integration: ${report.graphTests.ok ? "pass" : "skipped/fail"}`,
		);
	}

	process.exit(report.overallOk ? 0 : 1);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
