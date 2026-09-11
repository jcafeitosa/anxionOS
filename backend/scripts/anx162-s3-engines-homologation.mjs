#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
/**
 * ANX-162 S3 — engines-sandbox Docker profile homologation.
 *
 * Verifies: profile engines-sandbox, build/up/health, data-plane isolation, non-root,
 * read-only root FS, no docker.sock, restart recovery, HTTP /health oracle.
 *
 * Engines: gocryptotrader (:9053), hummingbot (:9054), freqtrade (:9055), xchange (:9056),
 * nautilus (:9057), cryptofeed (:9058), mt5 (:9059).
 *
 * Importers: package.json `anx162:s3-engines-homologation`
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const COMPOSE_FILE = "backend/deploy/docker/docker-compose.yml";
const COMPOSE_ENV_FILE = "backend/deploy/docker/.env";
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
		imagePattern: /anxionos\/gocryptotrader-sandbox:0\.1\.0-anx162-s5/,
	},
	{
		service: "hummingbot-sandbox",
		port: Number(process.env.HUMMINGBOT_SANDBOX_PORT ?? "9054"),
		engineId: "hummingbot",
		imagePattern: /anxionos\/hummingbot-sandbox:0\.1\.0-anx162-s5/,
	},
	{
		service: "freqtrade-sandbox",
		port: Number(process.env.FREQTRADE_SANDBOX_PORT ?? "9055"),
		engineId: "freqtrade",
		imagePattern: /anxionos\/freqtrade-sandbox:0\.1\.0-anx162-s5/,
	},
	{
		service: "xchange-sandbox",
		port: Number(process.env.XCHANGE_SANDBOX_PORT ?? "9056"),
		engineId: "xchange",
		imagePattern: /anxionos\/xchange-sandbox:0\.1\.0-anx162-s5/,
	},
	{
		service: "nautilus-sandbox",
		port: Number(process.env.NAUTILUS_SANDBOX_PORT ?? "9057"),
		engineId: "nautilus",
		imagePattern: /anxionos\/nautilus-sandbox:0\.1\.0-anx174-s1/,
	},
	{
		service: "cryptofeed-sandbox",
		port: Number(process.env.CRYPTOFEED_SANDBOX_PORT ?? "9058"),
		engineId: "cryptofeed",
		imagePattern: /anxionos\/cryptofeed-sandbox:0\.1\.0-anx179-s1/,
	},
	{
		service: "mt5-sandbox",
		port: Number(process.env.MT5_SANDBOX_PORT ?? "9059"),
		engineId: "mt5",
		imagePattern: /anxionos\/mt5-sandbox:0\.1\.0-anx180-s1/,
	},
];

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string", default: "ANX-162" },
			json: { type: "boolean", default: false },
			"skip-restart": { type: "boolean", default: false },
			"skip-build": { type: "boolean", default: false },
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

function probeHealthHttp(engine) {
	const container = `docker-${engine.service}-1`;
	const url = `http://localhost:${engine.port}/health`;
	const exec = run("docker", ["exec", container, "wget", "-qO-", url]);
	if (!exec.ok) {
		return {
			ok: false,
			url,
			error: exec.stderr.trim() || "wget exec failed",
		};
	}
	try {
		const body = JSON.parse(exec.stdout.trim());
		return {
			ok:
				body?.status === "ok" &&
				body?.engine === engine.engineId &&
				body?.simulated === true,
			body,
			url,
			via: "docker-exec",
		};
	} catch (error) {
		return {
			ok: false,
			url,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function inspectComposeStaticForEngine(raw, engine) {
	const servicePresent = raw.includes(engine.service);
	const readOnlyPresent = new RegExp(
		`${engine.service}:[\\s\\S]*?read_only:\\s*true`,
	).test(raw);
	const sandboxNetworkOnly = new RegExp(
		`${engine.service}:[\\s\\S]*?networks:[\\s\\S]*?- anxion-engines-sandbox`,
	).test(raw);
	const notOnControl = !new RegExp(
		`${engine.service}:[\\s\\S]*?anxion-control`,
	).test(raw);
	const notOnData = !new RegExp(`${engine.service}:[\\s\\S]*?anxion-data`).test(
		raw,
	);
	return {
		servicePresent,
		readOnlyPresent,
		sandboxNetworkOnly,
		notOnControl,
		notOnData,
		imagePinned: engine.imagePattern.test(raw),
	};
}

function inspectComposeStatic() {
	const raw = readFileSync(`${REPO_ROOT}/${COMPOSE_FILE}`, "utf8");
	const dockerSocketMount =
		/\/var\/run\/docker\.sock/.test(raw) || /docker\.sock:/.test(raw);
	const profilePresent = raw.includes("engines-sandbox");
	const engines = ENGINES.map((engine) => ({
		service: engine.service,
		...inspectComposeStaticForEngine(raw, engine),
	}));
	const enginesOk = engines.every(
		(e) =>
			e.servicePresent &&
			e.readOnlyPresent &&
			e.sandboxNetworkOnly &&
			e.notOnControl &&
			e.notOnData &&
			e.imagePinned,
	);
	return {
		noDockerSocket: !dockerSocketMount,
		profilePresent,
		engines,
		enginesOk,
	};
}

function inspectRuntimeSecurity(service) {
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
	const user = parsed.Config?.User ?? "";
	const readOnlyRootfs = Boolean(parsed.HostConfig?.ReadonlyRootfs);
	const mounts = parsed.Mounts ?? [];
	const dockerSock = mounts.some((m) =>
		String(m.Source ?? "").includes("docker.sock"),
	);
	const networks = Object.keys(parsed.NetworkSettings?.Networks ?? {});
	return {
		ok: true,
		nonRoot: user === "10001" || user.startsWith("10001:"),
		readOnlyRootfs,
		noDockerSocket: !dockerSock,
		networks,
		onSandboxNetwork:
			networks.includes("docker_anxion-engines-sandbox") ||
			networks.includes("anxion-engines-sandbox"),
		notOnControl:
			!networks.includes("docker_anxion-control") &&
			!networks.includes("anxion-control"),
		notOnData:
			!networks.includes("docker_anxion-data") &&
			!networks.includes("anxion-data"),
	};
}

function runtimeOk(runtime) {
	return Boolean(
		runtime?.ok &&
			runtime.nonRoot &&
			runtime.readOnlyRootfs &&
			runtime.noDockerSocket &&
			runtime.onSandboxNetwork &&
			runtime.notOnControl &&
			runtime.notOnData,
	);
}

async function homologateEngine(engine, opts) {
	const result = {
		service: engine.service,
		port: engine.port,
		build: null,
		up: null,
		health: { docker: null, http: null },
		runtime: null,
		restart: null,
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

	result.health.docker = await waitForHealthy(engine.service);
	result.health.http = probeHealthHttp(engine);
	result.runtime = inspectRuntimeSecurity(engine.service);

	if (!opts["skip-restart"]) {
		const restart = compose(["restart", engine.service]);
		const afterRestart = await waitForHealthy(engine.service);
		const httpAfter = probeHealthHttp(engine);
		result.restart = {
			commandOk: restart.ok,
			healthyAfter: afterRestart.ok,
			httpOkAfter: httpAfter.ok,
		};
	} else {
		result.restart = { skipped: true };
	}

	result.overallOk = Boolean(
		(opts["skip-build"] || result.build?.ok) &&
			result.up?.ok &&
			result.health.docker?.ok &&
			result.health.http?.ok &&
			runtimeOk(result.runtime) &&
			(opts["skip-restart"] ||
				(result.restart?.commandOk &&
					result.restart?.healthyAfter &&
					result.restart?.httpOkAfter)),
	);

	return result;
}

async function main() {
	const opts = parseCli(process.argv.slice(2));
	const staticReport = inspectComposeStatic();
	const report = {
		issue: opts.issue,
		slice: "S3-engines-sandbox-homologation",
		engines: ENGINES.map((e) => e.service),
		timestamp: new Date().toISOString(),
		static: staticReport,
		compose: { ok: false },
		results: [],
		overallOk: false,
	};

	const config = compose(["config", "--quiet"]);
	report.compose = {
		ok: config.ok,
		exitCode: config.status,
		stderr: config.stderr.trim(),
	};

	const staticOk =
		staticReport.noDockerSocket &&
		staticReport.profilePresent &&
		staticReport.enginesOk;

	if (!staticOk || !report.compose.ok) {
		emit(report, opts.json);
		process.exit(1);
	}

	for (const engine of ENGINES) {
		report.results.push(await homologateEngine(engine, opts));
	}

	report.overallOk = report.results.every((r) => r.overallOk);

	emit(report, opts.json);
	process.exit(report.overallOk ? 0 : 1);
}

function emit(report, asJson) {
	if (asJson) {
		console.log(JSON.stringify(report, null, 2));
		return;
	}
	console.log(
		`ANX-162 engines homologation — ${report.issue} (${report.slice})`,
	);
	console.log(`Engine services: ${report.engines.join(", ")}`);
	console.log(`Compose config: ${report.compose.ok ? "ok" : "fail"}`);
	console.log(
		`Static (profile/engines/isolation/read_only/pinned): ${
			report.static.profilePresent && report.static.enginesOk ? "ok" : "fail"
		}`,
	);
	console.log(
		`Security (no docker.sock in compose): ${report.static.noDockerSocket ? "ok" : "FAIL"}`,
	);
	for (const result of report.results) {
		console.log(`--- ${result.service} (:${result.port}) ---`);
		if (result.build?.skipped) {
			console.log("  Build: skipped");
		} else {
			console.log(`  Build: ${result.build?.ok ? "ok" : "fail"}`);
		}
		console.log(`  Up: ${result.up?.ok ? "ok" : "fail"}`);
		console.log(
			`  Docker health: ${result.health.docker?.ok ? "healthy" : "not healthy"} (${result.health.docker?.attempts ?? "?"} attempts)`,
		);
		console.log(`  HTTP /health: ${result.health.http?.ok ? "ok" : "fail"}`);
		if (result.runtime?.ok) {
			console.log(
				`  Runtime (non-root/read_only/no-sock/sandbox-net): ${
					runtimeOk(result.runtime) ? "ok" : "fail"
				}`,
			);
		} else {
			console.log(
				`  Runtime inspect: fail (${result.runtime?.error ?? "unknown"})`,
			);
		}
		if (result.restart?.skipped) {
			console.log("  Restart probe: skipped");
		} else if (result.restart) {
			console.log(
				`  Restart recovery: ${result.restart.healthyAfter && result.restart.httpOkAfter ? "ok" : "fail"}`,
			);
		}
		console.log(`  Engine overall: ${result.overallOk ? "PASS" : "FAIL"}`);
	}
	console.log(`Overall: ${report.overallOk ? "PASS" : "FAIL"}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
