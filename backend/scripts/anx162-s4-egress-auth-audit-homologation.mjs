#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
/**
 * ANX-162 S4 — egress deny, service auth, audit manifest homologation.
 *
 * Verifies: anxion-data internal (egress deny), ENGINE_SANDBOX_AUTH_TOKEN on engines,
 * API routes reject missing/invalid bearer, /health stays public, image digests in manifest.
 *
 * Importers: package.json `anx162:s4-egress-auth-audit-homologation`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

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

const ENGINES = [
	{
		service: "gocryptotrader-sandbox",
		port: Number(process.env.GCT_SANDBOX_PORT ?? "9053"),
		engineId: "gocryptotrader",
		image: "anxionos/gocryptotrader-sandbox:0.1.0-anx162-s5",
		apiPath: "/v1/getinfo",
	},
	{
		service: "hummingbot-sandbox",
		port: Number(process.env.HUMMINGBOT_SANDBOX_PORT ?? "9054"),
		engineId: "hummingbot",
		image: "anxionos/hummingbot-sandbox:0.1.0-anx162-s5",
		apiPath: "/v1/status",
	},
	{
		service: "freqtrade-sandbox",
		port: Number(process.env.FREQTRADE_SANDBOX_PORT ?? "9055"),
		engineId: "freqtrade",
		image: "anxionos/freqtrade-sandbox:0.1.0-anx162-s5",
		apiPath: "/api/v1/ping",
	},
	{
		service: "xchange-sandbox",
		port: Number(process.env.XCHANGE_SANDBOX_PORT ?? "9056"),
		engineId: "xchange",
		image: "anxionos/xchange-sandbox:0.1.0-anx162-s5",
		apiPath: "/api/v1/health",
	},
	{
		service: "nautilus-sandbox",
		port: Number(process.env.NAUTILUS_SANDBOX_PORT ?? "9057"),
		engineId: "nautilus",
		image: "anxionos/nautilus-sandbox:0.1.0-anx174-s1",
		apiPath: "/v1/system/status",
	},
	{
		service: "cryptofeed-sandbox",
		port: Number(process.env.CRYPTOFEED_SANDBOX_PORT ?? "9058"),
		engineId: "cryptofeed",
		image: "anxionos/cryptofeed-sandbox:0.1.0-anx179-s1",
		apiPath: "/v1/feeds/status",
	},
	{
		service: "mt5-sandbox",
		port: Number(process.env.MT5_SANDBOX_PORT ?? "9059"),
		engineId: "mt5",
		image: "anxionos/mt5-sandbox:0.1.0-anx180-s1",
		apiPath: "/v1/terminal/status",
	},
];

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string", default: "ANX-162" },
			json: { type: "boolean", default: false },
			"skip-build": { type: "boolean", default: false },
			"skip-egress": { type: "boolean", default: false },
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

function inspectComposeStatic() {
	const raw = readFileSync(`${REPO_ROOT}/${COMPOSE_FILE}`, "utf8");
	const enginesSandboxInternal =
		/anxion-engines-sandbox:[\s\S]*?internal:\s*true/.test(raw);
	const authTokenInCompose = raw.includes("ENGINE_SANDBOX_AUTH_TOKEN");
	const engines = ENGINES.map((engine) => ({
		service: engine.service,
		imagePinned: raw.includes(engine.image),
		authEnvPresent: new RegExp(
			`${engine.service}:[\\s\\S]*?ENGINE_SANDBOX_AUTH_TOKEN`,
		).test(raw),
		onSandboxNetwork: new RegExp(
			`${engine.service}:[\\s\\S]*?anxion-engines-sandbox`,
		).test(raw),
		notOnControl: !new RegExp(
			`${engine.service}:[\\s\\S]*?anxion-control`,
		).test(raw),
		notOnData: !new RegExp(`${engine.service}:[\\s\\S]*?anxion-data`).test(raw),
	}));
	return {
		enginesSandboxInternal,
		authTokenInCompose,
		engines,
		enginesOk: engines.every(
			(e) =>
				e.imagePinned &&
				e.authEnvPresent &&
				e.onSandboxNetwork &&
				e.notOnControl &&
				e.notOnData,
		),
	};
}

function loadDotEnv(path) {
	try {
		const raw = readFileSync(`${REPO_ROOT}/${path}`, "utf8");
		for (const line of raw.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) {
				continue;
			}
			const eq = trimmed.indexOf("=");
			if (eq <= 0) {
				continue;
			}
			const key = trimmed.slice(0, eq).trim();
			const value = trimmed.slice(eq + 1).trim();
			if (!process.env[key]) {
				process.env[key] = value;
			}
		}
	} catch {
		// optional — caller validates required keys
	}
}

function resolveAuthToken() {
	loadDotEnv(COMPOSE_ENV_FILE);
	const token = process.env.ENGINE_SANDBOX_AUTH_TOKEN?.trim();
	if (!token) {
		throw new Error(
			"ENGINE_SANDBOX_AUTH_TOKEN is required — set in backend/deploy/docker/.env",
		);
	}
	return token;
}

function probeHttp(service, port, path, headers = {}) {
	const container = `docker-${service}-1`;
	const url = `http://localhost:${port}${path}`;
	const args = ["exec", container, "wget", "-qO-"];
	for (const [key, value] of Object.entries(headers)) {
		args.push(`--header=${key}: ${value}`);
	}
	args.push(url);
	const exec = run("docker", args);
	if (!exec.ok) {
		const statusMatch = /HTTP\/\d(?:\.\d)? (\d{3})/.exec(exec.stderr);
		return {
			ok: false,
			status: statusMatch ? Number(statusMatch[1]) : exec.status,
			url,
			error: exec.stderr.trim() || "wget exec failed",
			via: "docker-exec",
		};
	}
	try {
		const body = JSON.parse(exec.stdout.trim());
		return { ok: true, status: 200, body, url, via: "docker-exec" };
	} catch {
		return {
			ok: false,
			status: 200,
			url,
			error: "invalid JSON body",
			via: "docker-exec",
		};
	}
}

function probeHttpStatus(service, port, path, headers = {}) {
	const container = `docker-${service}-1`;
	const url = `http://localhost:${port}${path}`;
	const args = [
		"exec",
		container,
		"wget",
		"--server-response",
		"-qO",
		"/dev/null",
	];
	for (const [key, value] of Object.entries(headers)) {
		args.push(`--header=${key}: ${value}`);
	}
	args.push(url);
	const exec = run("docker", args);
	const statusMatch = /HTTP\/\d(?:\.\d)? (\d{3})/.exec(exec.stderr);
	const status = statusMatch
		? Number(statusMatch[1])
		: exec.ok
			? 200
			: exec.status;
	return { ok: exec.ok, status, url, via: "docker-exec" };
}

function verifyServiceAuth(engine, token) {
	const health = probeHttp(engine.service, engine.port, "/health");
	const apiNoAuth = probeHttpStatus(
		engine.service,
		engine.port,
		engine.apiPath,
	);
	const apiBadAuth = probeHttpStatus(
		engine.service,
		engine.port,
		engine.apiPath,
		{
			Authorization: "Bearer invalid-token",
		},
	);
	const apiGoodAuth = probeHttp(engine.service, engine.port, engine.apiPath, {
		Authorization: `Bearer ${token}`,
	});
	return {
		healthPublic: health.ok && health.body?.engine === engine.engineId,
		apiRejectsMissing: apiNoAuth.status === 401,
		apiRejectsInvalid: apiBadAuth.status === 401,
		apiAcceptsValid: apiGoodAuth.ok && apiGoodAuth.body?.status === "ok",
	};
}

function verifyEgressDenied(service) {
	const container = `docker-${service}-1`;
	const probe = run("docker", [
		"exec",
		container,
		"wget",
		"--timeout=3",
		"-q",
		"-O",
		"/dev/null",
		"https://1.1.1.1",
	]);
	return {
		ok: !probe.ok,
		exitCode: probe.status,
		stderr: probe.stderr.trim(),
	};
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
	return { ok: Boolean(digest), digest };
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
		if (engine.digest && engine.digest !== runtime.digest) {
			mismatches.push(`${engine.service}: digest mismatch`);
		}
		engine.digest = runtime.digest;
	}
	manifest.generatedAt = new Date().toISOString();
	const ok = mismatches.length === 0;
	if (writeManifest) {
		writeFileSync(
			`${REPO_ROOT}/${MANIFEST_FILE}`,
			`${JSON.stringify(manifest, null, 2)}\n`,
		);
	}
	return { ok, mismatches, manifest };
}

async function homologateEngine(engine, token, opts) {
	const result = {
		service: engine.service,
		build: null,
		up: null,
		health: null,
		auth: null,
		egress: opts["skip-egress"] ? { skipped: true } : null,
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
	result.auth = verifyServiceAuth(engine, token);
	if (!opts["skip-egress"]) {
		result.egress = verifyEgressDenied(engine.service);
	}
	result.digest = inspectImageDigest(engine.image);

	result.overallOk = Boolean(
		(opts["skip-build"] || result.build?.ok) &&
			result.up?.ok &&
			result.health?.ok &&
			result.auth?.healthPublic &&
			result.auth?.apiRejectsMissing &&
			result.auth?.apiRejectsInvalid &&
			result.auth?.apiAcceptsValid &&
			(opts["skip-egress"] || result.egress?.ok) &&
			result.digest?.ok,
	);

	return result;
}

async function main() {
	const opts = parseCli(process.argv.slice(2));
	const token = resolveAuthToken();
	const staticReport = inspectComposeStatic();
	const report = {
		issue: opts.issue,
		slice: "S4-egress-auth-audit-homologation",
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

	if (
		!staticReport.enginesSandboxInternal ||
		!staticReport.authTokenInCompose ||
		!staticReport.enginesOk ||
		!report.compose.ok
	) {
		emit(report, opts.json);
		process.exit(1);
	}

	for (const engine of ENGINES) {
		report.results.push(await homologateEngine(engine, token, opts));
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
	console.log(`ANX-162 S4 homologation — ${report.issue} (${report.slice})`);
	console.log(`Compose config: ${report.compose.ok ? "ok" : "fail"}`);
	console.log(
		`Static (internal engines-sandbox + auth env): ${
			report.static.enginesSandboxInternal && report.static.authTokenInCompose
				? "ok"
				: "fail"
		}`,
	);
	for (const result of report.results) {
		console.log(`--- ${result.service} ---`);
		console.log(
			`  Build: ${result.build?.skipped ? "skipped" : result.build?.ok ? "ok" : "fail"}`,
		);
		console.log(`  Up: ${result.up?.ok ? "ok" : "fail"}`);
		console.log(`  Health: ${result.health?.ok ? "ok" : "fail"}`);
		console.log(
			`  Auth (public /health, API bearer): ${
				result.auth?.healthPublic &&
				result.auth?.apiRejectsMissing &&
				result.auth?.apiAcceptsValid
					? "ok"
					: "fail"
			}`,
		);
		if (result.egress?.skipped) {
			console.log("  Egress deny: skipped");
		} else {
			console.log(`  Egress deny: ${result.egress?.ok ? "ok" : "fail"}`);
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
