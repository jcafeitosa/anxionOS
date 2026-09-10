#!/usr/bin/env bun
/**
 * ANX-290 — P2 sandbox live homologation report (Neo4j + optional API health + self-healing).
 *
 * User instruction (verbatim goal): evidências de runtime aplicáveis para entregável 8;
 * homologação staging live (Neo4j graph-sandbox, health API sem --simulate quando disponível).
 *
 * Importers/callers: package.json `p2:sandbox-homologation`, manual/CI staging verification
 * Affected API: docker compose graph-sandbox, Neo4j integration test, orchestration:self-healing run
 * Data schemas: JSON report { neo4j, graphTests, apiHealth, selfHealing, overallOk }
 */
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const DEFAULT_HEALTH_URL = process.env.API_HEALTH_URL ?? "http://127.0.0.1:3000/health";

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string", default: "ANX-290" },
			json: { type: "boolean", default: false },
			"skip-self-healing": { type: "boolean", default: false },
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

async function probeHealth(url) {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
		return { ok: response.ok, status: response.status, url };
	} catch (error) {
		return {
			ok: false,
			status: 0,
			url,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

async function main() {
	const opts = parseCli(process.argv.slice(2));
	const report = {
		issue: opts.issue,
		timestamp: new Date().toISOString(),
		neo4j: { profile: "graph-sandbox", ok: false },
		graphTests: { ok: false },
		apiHealth: null,
		selfHealing: null,
	};

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
		["test", "backend/tests/graph/neo4j-sandbox-homologation.integration.test.ts"],
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

	const health = await probeHealth(DEFAULT_HEALTH_URL);
	report.apiHealth = health;

	if (!opts["skip-self-healing"] && health.ok) {
		const healing = run(
			"npm",
			[
				"run",
				"orchestration:self-healing",
				"--",
				"approve-g4",
				"--runbook",
				"sh-rb-002-http-5xx",
				"--issue",
				opts.issue,
				"--persona",
				"security-lead",
				"--evidence",
				"ANX-290 live homologation",
			],
			{},
		);
		const healingRun = run(
			"npm",
			[
				"run",
				"orchestration:self-healing",
				"--",
				"run",
				"--runbook",
				"sh-rb-002-http-5xx",
				"--issue",
				opts.issue,
				"--environment",
				"staging",
				"--json",
			],
			{},
		);
		report.selfHealing = {
			mode: "live",
			ok: healing.ok && healingRun.ok,
			exitCode: healingRun.status,
			stdout: healingRun.stdout.trim(),
		};
	} else if (!opts["skip-self-healing"]) {
		report.selfHealing = {
			mode: "skipped",
			reason: "API health unavailable",
			url: DEFAULT_HEALTH_URL,
		};
	}

	report.overallOk = Boolean(report.neo4j.ok && report.graphTests.ok);

	if (opts.json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(`P2 sandbox homologation — ${opts.issue}`);
		console.log(`Neo4j running: ${report.neo4j.ok ? "yes" : "no"}`);
		console.log(`Neo4j integration test: ${report.graphTests.ok ? "pass" : "fail"}`);
		console.log(`API health (${DEFAULT_HEALTH_URL}): ${health.ok ? "ok" : "unavailable"}`);
		if (report.selfHealing) {
			console.log(`Self-healing: ${report.selfHealing.mode}${report.selfHealing.ok ? " pass" : ""}`);
		}
	}

	process.exit(report.overallOk ? 0 : 1);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
