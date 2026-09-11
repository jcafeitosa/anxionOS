#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
/**
 * ANX-162 S5 — resource limits, structured logging, rollback homologation.
 *
 * Verifies: compose CPU/memory limits, json-file logging driver, structured JSON stdout,
 * manifest-pinned rollback (down → up --no-build), health recovery after stop/start.
 *
 * Importers: package.json `anx162:s5-limits-logs-rollback-homologation`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { parseSandboxLogLine } from "../deploy/docker/engines/shared/sandbox-logger.mjs";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const COMPOSE_FILE = "backend/deploy/docker/docker-compose.yml";
const COMPOSE_ENV_FILE = "backend/deploy/docker/.env";
const MANIFEST_FILE =
	"backend/deploy/docker/audit/engine-sandbox-manifest.json";
const COMPOSE_ARGS = [
	"-f",
	COMPOSE_FILE,
	"--env-file",
	COMPOSE_ENV_FILE,
	"--profile",
	"engines-sandbox",
];
const COMPOSE_BIN = process.env.DOCKER_COMPOSE_BIN ?? "docker-compose";
const SANDBOX_VERSION = "0.1.0-anx162-s5";

const ENGINES = [
	{
		service: "gocryptotrader-sandbox",
		port: Number(process.env.GCT_SANDBOX_PORT ?? "9053"),
		engineId: "gocryptotrader",
		image: `anxionos/gocryptotrader-sandbox:${SANDBOX_VERSION}`,
		expectedCpu: 1.0,
		expectedMemoryBytes: 512 * 1024 * 1024,
		issueLabel: "ANX-162",
	},
	{
		service: "hummingbot-sandbox",
		port: Number(process.env.HUMMINGBOT_SANDBOX_PORT ?? "9054"),
		engineId: "hummingbot",
		image: `anxionos/hummingbot-sandbox:${SANDBOX_VERSION}`,
		expectedCpu: 1.0,
		expectedMemoryBytes: 512 * 1024 * 1024,
		issueLabel: "ANX-162",
	},
	{
		service: "freqtrade-sandbox",
		port: Number(process.env.FREQTRADE_SANDBOX_PORT ?? "9055"),
		engineId: "freqtrade",
		image: `anxionos/freqtrade-sandbox:${SANDBOX_VERSION}`,
		expectedCpu: 1.0,
		expectedMemoryBytes: 512 * 1024 * 1024,
		issueLabel: "ANX-162",
	},
	{
		service: "xchange-sandbox",
		port: Number(process.env.XCHANGE_SANDBOX_PORT ?? "9056"),
		engineId: "xchange",
		image: `anxionos/xchange-sandbox:${SANDBOX_VERSION}`,
		expectedCpu: 1.0,
		expectedMemoryBytes: 512 * 1024 * 1024,
		issueLabel: "ANX-162",
	},
	{
		service: "nautilus-sandbox",
		port: Number(process.env.NAUTILUS_SANDBOX_PORT ?? "9057"),
		engineId: "nautilus",
		image: "anxionos/nautilus-sandbox:0.1.0-anx174-s1",
		expectedCpu: 1.0,
		expectedMemoryBytes: 512 * 1024 * 1024,
		issueLabel: "ANX-174",
	},
	{
		service: "cryptofeed-sandbox",
		port: Number(process.env.CRYPTOFEED_SANDBOX_PORT ?? "9058"),
		engineId: "cryptofeed",
		image: "anxionos/cryptofeed-sandbox:0.1.0-anx179-s1",
		expectedCpu: 1.0,
		expectedMemoryBytes: 512 * 1024 * 1024,
		issueLabel: "ANX-179",
	},
	{
		service: "mt5-sandbox",
		port: Number(process.env.MT5_SANDBOX_PORT ?? "9059"),
		engineId: "mt5",
		image: "anxionos/mt5-sandbox:0.1.0-anx180-s1",
		expectedCpu: 1.0,
		expectedMemoryBytes: 512 * 1024 * 1024,
		issueLabel: "ANX-180",
	},
];

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string", default: "ANX-162" },
			json: { type: "boolean", default: false },
			"skip-build": { type: "boolean", default: false },
			"skip-rollback": { type: "boolean", default: false },
			"write-manifest": { type: "boolean", default: false },
		},
		allowPositionals: false,
	});
	return values;
}

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

async function waitForHealthy(service, attempts = 40, intervalMs = 2000) {
	for (let i = 0; i < attempts; i += 1) {
		const ps = compose(["ps", "--format", "json", service]);
		if (ps.ok && ps.stdout.includes('"Health":"healthy"')) {
			return { ok: true, attempts: i + 1 };
		}
		await sleep(intervalMs);
	}
	return { ok: false, attempts };
}

function extractServiceBlock(raw, service) {
	const marker = new RegExp(`^  ${service}:`, "m");
	const match = marker.exec(raw);
	if (!match) {
		return "";
	}
	const start = match.index;
	const rest = raw.slice(start);
	const nextService = rest.slice(service.length + 4).search(/^  [a-z0-9-]+:/m);
	return nextService === -1
		? rest
		: rest.slice(0, service.length + 4 + nextService);
}

function inspectComposeStatic() {
	const raw = readFileSync(`${REPO_ROOT}/${COMPOSE_FILE}`, "utf8");
	const engines = ENGINES.map((engine) => {
		const block = extractServiceBlock(raw, engine.service);
		return {
			service: engine.service,
			imagePinned: block.includes(engine.image),
			cpuLimit: /cpus:\s*["']?1\.0/.test(block),
			memoryLimit: /memory:\s*512M/.test(block),
			loggingDriver: /logging:[\s\S]*?driver:\s*json-file/.test(block),
			issueLabel: new RegExp(
				`anxion\\.issue:\\s*"?${engine.issueLabel ?? "ANX-162"}"?`,
			).test(block),
		};
	});
	return {
		engines,
		enginesOk: engines.every(
			(e) =>
				e.imagePinned &&
				e.cpuLimit &&
				e.memoryLimit &&
				e.loggingDriver &&
				e.issueLabel,
		),
	};
}

function inspectRuntimeLimits(service) {
	const inspect = run("docker", [
		"inspect",
		`docker-${service}-1`,
		"--format",
		"{{json .}}",
	]);
	if (!inspect.ok) {
		return { ok: false, error: inspect.stderr.trim() || "inspect failed" };
	}
	let parsed;
	try {
		parsed = JSON.parse(inspect.stdout.trim());
	} catch {
		return { ok: false, error: "invalid inspect JSON" };
	}
	const memory = parsed.HostConfig?.Memory ?? 0;
	const nanoCpus = parsed.HostConfig?.NanoCpus ?? 0;
	const loggingDriver = parsed.HostConfig?.LogConfig?.Type ?? "";
	return {
		ok: true,
		memory,
		nanoCpus,
		loggingDriver,
		memoryOk: memory === 0 || memory <= 512 * 1024 * 1024,
		cpuOk: nanoCpus === 0 || nanoCpus <= 1_000_000_000,
		loggingOk: loggingDriver === "json-file" || loggingDriver === "",
	};
}

function verifyStructuredLogs(service, engineId) {
	const logs = run("docker", ["logs", "--tail", "30", `docker-${service}-1`]);
	if (!logs.ok) {
		return { ok: false, error: logs.stderr.trim() || "docker logs failed" };
	}
	const structured = logs.stdout
		.split("\n")
		.map((line) => parseSandboxLogLine(line))
		.filter(Boolean);
	const started = structured.find((entry) => entry.event === "sandbox.started");
	return {
		ok:
			structured.length >= 1 &&
			started?.engine === engineId &&
			started?.slice === "S5",
		count: structured.length,
		startedEvent: started?.event ?? null,
	};
}

function probeHealthHttp(engine) {
	const container = `docker-${engine.service}-1`;
	const exec = run("docker", [
		"exec",
		container,
		"wget",
		"-qO-",
		`http://localhost:${engine.port}/health`,
	]);
	if (!exec.ok) {
		return { ok: false, error: exec.stderr.trim() || "wget exec failed" };
	}
	try {
		const body = JSON.parse(exec.stdout.trim());
		return {
			ok: body?.status === "ok" && body?.engine === engine.engineId,
			body,
		};
	} catch {
		return { ok: false, error: "invalid JSON body" };
	}
}

function inspectImageDigest(image) {
	const inspect = run("docker", [
		"image",
		"inspect",
		image,
		"--format",
		"{{json .RepoDigests}}",
	]);
	if (!inspect.ok) {
		return {
			ok: false,
			error: inspect.stderr.trim() || "image inspect failed",
		};
	}
	let digests = [];
	try {
		digests = JSON.parse(inspect.stdout.trim());
	} catch {
		return { ok: false, error: "invalid digest JSON" };
	}
	const digest =
		digests.find((entry) => entry.includes("@sha256:")) ??
		run("docker", [
			"image",
			"inspect",
			image,
			"--format",
			"{{.Id}}",
		]).stdout.trim();
	return { ok: Boolean(digest), digest, image };
}

function loadManifest() {
	return JSON.parse(readFileSync(`${REPO_ROOT}/${MANIFEST_FILE}`, "utf8"));
}

function verifyAuditManifest(digestsByService, writeManifest) {
	const manifest = loadManifest();
	const mismatches = [];
	for (const engine of manifest.engines) {
		const runtime = digestsByService[engine.service];
		if (!runtime?.ok) {
			mismatches.push(`${engine.service}: digest unavailable`);
			continue;
		}
		if (engine.image !== runtime.image) {
			mismatches.push(`${engine.service}: image tag mismatch`);
		}
		engine.digest = runtime.digest;
	}
	manifest.slice = "S5-limits-logs-rollback";
	manifest.generatedAt = new Date().toISOString();
	if (manifest.policy) {
		manifest.policy.resourceLimits = {
			cpu: "1.0",
			memory: "512M",
			loggingDriver: "json-file",
		};
		manifest.policy.rollback = {
			strategy: "manifest-pinned-image",
			description: "compose down → up --no-build restores manifest digest",
		};
	}
	const ok = mismatches.length === 0;
	if (writeManifest) {
		writeFileSync(
			`${REPO_ROOT}/${MANIFEST_FILE}`,
			`${JSON.stringify(manifest, null, 2)}\n`,
		);
	}
	return { ok, mismatches, manifest };
}

async function verifyRollback(engine, manifestDigest) {
	const down = compose(["rm", "-sf", engine.service]);
	const up = compose(["up", "-d", "--no-build", engine.service]);
	const healthy = await waitForHealthy(engine.service);
	const health = probeHealthHttp(engine);
	const digest = inspectImageDigest(engine.image);
	const digestMatches =
		!manifestDigest || !digest.digest || digest.digest === manifestDigest;
	return {
		downOk: down.ok,
		upOk: up.ok,
		healthy: healthy.ok,
		healthHttp: health.ok,
		digestOk: digest.ok,
		digestMatches,
		ok: Boolean(
			down.ok && up.ok && healthy.ok && health.ok && digest.ok && digestMatches,
		),
	};
}

async function homologateEngine(engine, opts, manifestDigest) {
	const result = {
		service: engine.service,
		build: null,
		up: null,
		health: null,
		limits: { static: null, runtime: null },
		logs: null,
		rollback: opts["skip-rollback"] ? { skipped: true } : null,
		digest: null,
		overallOk: false,
	};

	if (!opts["skip-build"]) {
		const build = compose(["build", engine.service]);
		result.build = { ok: build.ok, exitCode: build.status };
		if (!build.ok) {
			return result;
		}
	} else {
		result.build = { skipped: true };
	}

	const up = compose(["up", "-d", engine.service]);
	result.up = { ok: up.ok, exitCode: up.status };
	if (!up.ok) {
		return result;
	}

	result.health = await waitForHealthy(engine.service);
	const httpHealth = probeHealthHttp(engine);
	result.health.http = httpHealth;

	const raw = readFileSync(`${REPO_ROOT}/${COMPOSE_FILE}`, "utf8");
	const block = extractServiceBlock(raw, engine.service);
	result.limits.static = {
		cpuLimit: /cpus:\s*["']?1\.0/.test(block),
		memoryLimit: /memory:\s*512M/.test(block),
		loggingDriver: /logging:[\s\S]*?driver:\s*json-file/.test(block),
	};
	result.limits.runtime = inspectRuntimeLimits(engine.service);
	result.logs = verifyStructuredLogs(engine.service, engine.engineId);

	if (!opts["skip-rollback"]) {
		result.rollback = await verifyRollback(engine, manifestDigest);
	}

	result.digest = inspectImageDigest(engine.image);

	result.overallOk = Boolean(
		(opts["skip-build"] || result.build?.ok) &&
			result.up?.ok &&
			result.health?.ok &&
			httpHealth.ok &&
			result.limits.static.cpuLimit &&
			result.limits.static.memoryLimit &&
			result.limits.static.loggingDriver &&
			result.limits.runtime?.ok &&
			(result.limits.runtime.memoryOk || result.limits.runtime.memory === 0) &&
			(result.limits.runtime.cpuOk || result.limits.runtime.nanoCpus === 0) &&
			result.logs?.ok &&
			(opts["skip-rollback"] || result.rollback?.ok) &&
			result.digest?.ok,
	);

	return result;
}

async function main() {
	const opts = parseCli(process.argv.slice(2));
	const staticReport = inspectComposeStatic();
	const manifest = loadManifest();
	const digestByService = Object.fromEntries(
		manifest.engines.map((entry) => [entry.service, entry.digest ?? null]),
	);

	const report = {
		issue: opts.issue,
		slice: "S5-limits-logs-rollback-homologation",
		sandboxVersion: SANDBOX_VERSION,
		timestamp: new Date().toISOString(),
		static: staticReport,
		compose: { ok: false },
		results: [],
		auditManifest: null,
		overallOk: false,
	};

	const config = compose(["config", "--quiet"]);
	report.compose = {
		ok: config.ok,
		exitCode: config.status,
		stderr: config.stderr.trim(),
	};

	if (!staticReport.enginesOk || !report.compose.ok) {
		emit(report, opts.json);
		process.exit(1);
	}

	for (const engine of ENGINES) {
		report.results.push(
			await homologateEngine(engine, opts, digestByService[engine.service]),
		);
	}

	const digestsByService = Object.fromEntries(
		report.results.map((result) => [
			result.service,
			{
				image: ENGINES.find((e) => e.service === result.service)?.image,
				ok: result.digest?.ok,
				digest: result.digest?.digest,
			},
		]),
	);
	report.auditManifest = verifyAuditManifest(
		digestsByService,
		opts["write-manifest"],
	);
	report.overallOk =
		report.results.every((r) => r.overallOk) && report.auditManifest.ok;

	emit(report, opts.json);
	process.exit(report.overallOk ? 0 : 1);
}

function emit(report, asJson) {
	if (asJson) {
		console.log(JSON.stringify(report, null, 2));
		return;
	}
	console.log(`ANX-162 S5 homologation — ${report.issue} (${report.slice})`);
	console.log(`Sandbox version: ${report.sandboxVersion}`);
	console.log(`Compose config: ${report.compose.ok ? "ok" : "fail"}`);
	console.log(
		`Static (limits/logging/tags): ${report.static.enginesOk ? "ok" : "fail"}`,
	);
	for (const result of report.results) {
		console.log(`--- ${result.service} ---`);
		console.log(
			`  Build: ${result.build?.skipped ? "skipped" : result.build?.ok ? "ok" : "fail"}`,
		);
		console.log(`  Up: ${result.up?.ok ? "ok" : "fail"}`);
		console.log(
			`  Health: ${result.health?.ok && result.health?.http?.ok ? "ok" : "fail"}`,
		);
		console.log(
			`  Limits (static/runtime): ${
				result.limits?.static?.cpuLimit &&
				result.limits?.static?.memoryLimit &&
				result.limits?.runtime?.ok
					? "ok"
					: "fail"
			}`,
		);
		console.log(
			`  Structured logs: ${result.logs?.ok ? `ok (${result.logs.count})` : "fail"}`,
		);
		if (result.rollback?.skipped) {
			console.log("  Rollback: skipped");
		} else {
			console.log(
				`  Rollback (down/up --no-build): ${result.rollback?.ok ? "ok" : "fail"}`,
			);
		}
		console.log(
			`  Image digest: ${result.digest?.ok ? result.digest.digest : "fail"}`,
		);
		console.log(`  Engine overall: ${result.overallOk ? "PASS" : "FAIL"}`);
	}
	console.log(
		`Audit manifest: ${report.auditManifest?.ok ? "ok" : `fail (${report.auditManifest?.mismatches?.join(", ")})`}`,
	);
	console.log(`Overall: ${report.overallOk ? "PASS" : "FAIL"}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
