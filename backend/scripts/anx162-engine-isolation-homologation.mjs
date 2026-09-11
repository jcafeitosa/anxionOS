#!/usr/bin/env bun
/**
 * ANX-162 S2 — engine/storage Docker isolation homologation (ADR0004 + gateway §Isolamento Docker).
 *
 * Verifies: compose valid, no docker.sock mounts, isolated networks, health/readiness,
 * ADR0004 extensions (timescaledb + vector), restart recovery for postgres.
 *
 * Importers: package.json `anx162:engine-isolation-homologation`
 * Data schemas: JSON report { compose, security, networks, storage, restart, overallOk }
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const COMPOSE_FILE = "backend/deploy/docker/docker-compose.yml";
const COMPOSE_ARGS = ["-f", COMPOSE_FILE];

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string", default: "ANX-162" },
			json: { type: "boolean", default: false },
			"skip-restart": { type: "boolean", default: false },
		},
		allowPositionals: false,
	});
	return values;
}

const COMPOSE_BIN = process.env.DOCKER_COMPOSE_BIN ?? "docker-compose";

function run(command, args, env = {}) {
	const result = spawnSync(command, args, {
		cwd: REPO_ROOT,
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

function compose(args, env = {}) {
	return run(COMPOSE_BIN, [...COMPOSE_ARGS, ...args], env);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealthy(service, attempts = 30, intervalMs = 2000) {
	for (let i = 0; i < attempts; i += 1) {
		const ps = compose(["ps", "--format", "json", service]);
		if (ps.ok && ps.stdout.includes('"Health":"healthy"')) {
			return { ok: true, attempts: i + 1 };
		}
		if (ps.ok && ps.stdout.includes('"State":"running"') && !ps.stdout.includes('"Health"')) {
			return { ok: true, attempts: i + 1, note: "no healthcheck" };
		}
		await sleep(intervalMs);
	}
	return { ok: false, attempts };
}

async function verifyPostgresExtensions() {
	const user = process.env.POSTGRES_USER ?? "anxionos";
	const db = process.env.POSTGRES_DB ?? "anxionos";
	const sql =
		"SELECT extname FROM pg_extension WHERE extname IN ('timescaledb','vector') ORDER BY extname;";
	const exec = compose([
		"exec",
		"-T",
		"postgres",
		"psql",
		"-U",
		user,
		"-d",
		db,
		"-At",
		"-c",
		sql,
	]);
	const extensions = exec.stdout
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	return {
		ok: extensions.includes("timescaledb") && extensions.includes("vector"),
		extensions,
		stderr: exec.stderr.trim(),
	};
}

function inspectComposeSecurity() {
	const raw = readFileSync(`${REPO_ROOT}/${COMPOSE_FILE}`, "utf8");
	const dockerSocketMount =
		/\/var\/run\/docker\.sock/.test(raw) || /docker\.sock:/.test(raw);
	const networksPresent = ["anxion-control", "anxion-data", "anxion-observability"].every(
		(name) => raw.includes(name),
	);
	return {
		dockerSocketMount,
		noDockerSocket: !dockerSocketMount,
		networksPresent,
		timescaleImagePinned: /timescale\/timescaledb:\d+\.\d+\.\d+-pg16/.test(raw),
	};
}

async function main() {
	const opts = parseCli(process.argv.slice(2));
	const report = {
		issue: opts.issue,
		slice: "S2-storage-networks-homologation",
		timestamp: new Date().toISOString(),
		compose: { ok: false },
		security: inspectComposeSecurity(),
		networks: { expected: ["anxion-control", "anxion-data", "anxion-observability"] },
		storage: { postgres: { ok: false }, extensions: { ok: false } },
		restart: null,
		overallOk: false,
	};

	const config = compose(["config", "--quiet"]);
	report.compose = {
		ok: config.ok,
		exitCode: config.status,
		stderr: config.stderr.trim(),
	};

	if (!report.security.noDockerSocket || !report.security.networksPresent) {
		report.overallOk = false;
		emit(report, opts.json);
		process.exit(1);
	}

	const up = compose(["up", "-d", "postgres", "nats"]);
	report.storage.up = { ok: up.ok, exitCode: up.status };

	const postgresHealth = await waitForHealthy("postgres");
	const natsHealth = await waitForHealthy("nats");
	report.storage.postgres = postgresHealth;
	report.storage.nats = natsHealth;

	const extensions = await verifyPostgresExtensions();
	report.storage.extensions = extensions;

	if (!opts["skip-restart"]) {
		const restart = compose(["restart", "postgres"]);
		const afterRestart = await waitForHealthy("postgres");
		const extensionsAfter = await verifyPostgresExtensions();
		report.restart = {
			commandOk: restart.ok,
			healthyAfter: afterRestart.ok,
			extensionsOk: extensionsAfter.ok,
		};
	} else {
		report.restart = { skipped: true };
	}

	report.overallOk = Boolean(
		report.compose.ok &&
			report.security.noDockerSocket &&
			report.security.networksPresent &&
			report.security.timescaleImagePinned &&
			report.storage.up?.ok &&
			report.storage.postgres?.ok &&
			report.storage.nats?.ok &&
			report.storage.extensions?.ok &&
			(opts["skip-restart"] ||
				(report.restart?.commandOk &&
					report.restart?.healthyAfter &&
					report.restart?.extensionsOk)),
	);

	emit(report, opts.json);
	process.exit(report.overallOk ? 0 : 1);
}

function emit(report, asJson) {
	if (asJson) {
		console.log(JSON.stringify(report, null, 2));
		return;
	}
	console.log(`ANX-162 engine isolation homologation — ${report.issue} (${report.slice})`);
	console.log(`Compose config: ${report.compose.ok ? "ok" : "fail"}`);
	console.log(
		`Security (no docker.sock): ${report.security.noDockerSocket ? "ok" : "FAIL"}`,
	);
	console.log(
		`Networks defined: ${report.security.networksPresent ? "ok" : "fail"}`,
	);
	console.log(
		`Timescale image pinned: ${report.security.timescaleImagePinned ? "ok" : "fail"}`,
	);
	console.log(
		`Postgres healthy: ${report.storage.postgres?.ok ? "yes" : "no"}`,
	);
	console.log(`NATS healthy: ${report.storage.nats?.ok ? "yes" : "no"}`);
	console.log(
		`ADR0004 extensions (timescaledb+vector): ${report.storage.extensions?.ok ? "ok" : "fail"}`,
	);
	if (report.restart?.skipped) {
		console.log("Restart probe: skipped");
	} else if (report.restart) {
		console.log(
			`Restart recovery: ${report.restart.healthyAfter && report.restart.extensionsOk ? "ok" : "fail"}`,
		);
	}
	console.log(`Overall: ${report.overallOk ? "PASS" : "FAIL"}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
