#!/usr/bin/env bun
/**
 * ANX-292 — P3 staging homologation report (Neo4j graph-staging profile).
 *
 * User instruction: continue AI Product Company Engine — P3 staging homologation
 * after sandbox P2 (ANX-290/291 done).
 *
 * Importers/callers: package.json `p3:staging-homologation`
 * Affected API: docker compose graph-staging, Neo4j staging integration test
 * Data schemas: JSON report { neo4j, graphTests, overallOk }
 */
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const STAGING_URI = process.env.NEO4J_STAGING_URI ?? "bolt://localhost:7688";
const STAGING_USER = process.env.NEO4J_STAGING_USER ?? "neo4j";
const STAGING_PASSWORD =
	process.env.NEO4J_STAGING_PASSWORD ?? "anxionos-staging";

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string", default: "ANX-292" },
			json: { type: "boolean", default: false },
			"skip-up": { type: "boolean", default: false },
		},
		allowPositionals: false,
	});
	return values;
}

async function waitForStagingNeo4j(maxMs = 90_000) {
	const started = Date.now();
	while (Date.now() - started < maxMs) {
		try {
			const response = await fetch("http://127.0.0.1:7475", {
				signal: AbortSignal.timeout(2000),
			});
			if (response.ok || response.status === 200) {
				return { ok: true, waitedMs: Date.now() - started };
			}
		} catch {
			// retry until timeout
		}
		await new Promise((resolve) => setTimeout(resolve, 3000));
	}
	return { ok: false, waitedMs: Date.now() - started };
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
		profile: "graph-staging",
		neo4j: { ok: false },
		graphTests: { ok: false },
	};

	if (!opts["skip-up"]) {
		const up = run("docker-compose", [
			"-f",
			"backend/deploy/docker/docker-compose.yml",
			"--profile",
			"graph-staging",
			"up",
			"-d",
			"neo4j-staging",
		]);
		report.neo4j.composeUp = { ok: up.ok, exitCode: up.status };
		if (up.ok) {
			report.neo4j.ready = await waitForStagingNeo4j();
		}
	}

	const compose = run("docker-compose", [
		"-f",
		"backend/deploy/docker/docker-compose.yml",
		"--profile",
		"graph-staging",
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
	report.neo4j.ok = report.neo4j.runningServices.includes("neo4j-staging");
	if (report.neo4j.ok && !report.neo4j.ready) {
		report.neo4j.ready = await waitForStagingNeo4j();
	}
	if (report.neo4j.ready && !report.neo4j.ready.ok) {
		report.overallOk = false;
		if (opts.json) {
			console.log(JSON.stringify(report, null, 2));
		} else {
			console.error("Neo4j staging not ready within timeout");
		}
		process.exit(1);
	}

	await new Promise((resolve) => setTimeout(resolve, 5000));

	let graphTests = run(
		"bun",
		[
			"test",
			"backend/tests/graph/neo4j-staging-homologation.integration.test.ts",
		],
		{
			RUN_NEO4J_STAGING_INTEGRATION_TESTS: "true",
			NEO4J_STAGING_URI: STAGING_URI,
			NEO4J_STAGING_USER: STAGING_USER,
			NEO4J_STAGING_PASSWORD: STAGING_PASSWORD,
		},
	);
	if (!graphTests.ok) {
		await new Promise((resolve) => setTimeout(resolve, 10_000));
		graphTests = run(
			"bun",
			[
				"test",
				"backend/tests/graph/neo4j-staging-homologation.integration.test.ts",
			],
			{
				RUN_NEO4J_STAGING_INTEGRATION_TESTS: "true",
				NEO4J_STAGING_URI: STAGING_URI,
				NEO4J_STAGING_USER: STAGING_USER,
				NEO4J_STAGING_PASSWORD: STAGING_PASSWORD,
			},
		);
	}
	report.graphTests = {
		ok: graphTests.ok,
		exitCode: graphTests.status,
		stderr: graphTests.stderr.trim().slice(-500),
	};

	report.overallOk = Boolean(report.neo4j.ok && report.graphTests.ok);

	if (opts.json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(`P3 staging homologation — ${opts.issue}`);
		console.log(`Neo4j staging running: ${report.neo4j.ok ? "yes" : "no"}`);
		console.log(
			`Staging integration test: ${report.graphTests.ok ? "pass" : "fail"}`,
		);
	}

	process.exit(report.overallOk ? 0 : 1);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
