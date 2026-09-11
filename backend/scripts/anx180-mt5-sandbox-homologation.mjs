#!/usr/bin/env bun
/**
 * ANX-180 — MetaTrader 5 sandbox homologation oracle.
 *
 * Verifies: engines-sandbox profile slot mt5-sandbox (:9059), build/up/health,
 * non-root, read-only root FS, internal network, structured logging, auth on API paths.
 *
 * Importers: package.json `anx180:mt5-sandbox-homologation`
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { parseSandboxLogLine } from "../deploy/docker/engines/shared/sandbox-logger.mjs";

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
const SANDBOX_VERSION = "0.1.0-anx180-s1";

const ENGINE = {
	service: "mt5-sandbox",
	port: Number(process.env.MT5_SANDBOX_PORT ?? "9059"),
	engineId: "mt5",
	image: `anxionos/mt5-sandbox:${SANDBOX_VERSION}`,
	imagePattern: /anxionos\/mt5-sandbox:0\.1\.0-anx180-s1/,
	apiProbePath: "/v1/terminal/status",
};

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string", default: "ANX-180" },
			json: { type: "boolean", default: false },
			"skip-build": { type: "boolean", default: false },
			"skip-restart": { type: "boolean", default: false },
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
		return { ok: false, url, error: exec.stderr.trim() || "wget exec failed" };
	}
	try {
		const body = JSON.parse(exec.stdout.trim());
		return {
			ok:
				body?.status === "ok" &&
				body?.engine === engine.engineId &&
				body?.simulated === true &&
				body?.adapterId === "adapter-mt5",
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

function probeApiAuth(engine, authToken) {
	const container = `docker-${engine.service}-1`;
	const url = `http://localhost:${engine.port}${engine.apiProbePath}`;
	const withoutAuth = run("docker", [
		"exec",
		container,
		"wget",
		"-qO-",
		url,
	]);
	const withAuth = run("docker", [
		"exec",
		container,
		"wget",
		"-qO-",
		"--header",
		`Authorization: Bearer ${authToken}`,
		url,
	]);
	let authedBody;
	try {
		authedBody = JSON.parse(withAuth.stdout.trim());
	} catch {
		authedBody = null;
	}
	return {
		rejectsWithoutAuth: !withoutAuth.ok || withoutAuth.status !== 0,
		acceptsWithAuth:
			withAuth.ok &&
			authedBody?.status === "ok" &&
			authedBody?.engine === "mt5-sandbox" &&
			authedBody?.simulated === true,
	};
}

function inspectComposeStatic() {
	const raw = readFileSync(`${REPO_ROOT}/${COMPOSE_FILE}`, "utf8");
	const servicePresent = raw.includes(ENGINE.service);
	const readOnlyPresent = new RegExp(
		`${ENGINE.service}:[\\s\\S]*?read_only:\\s*true`,
	).test(raw);
	const sandboxNetworkOnly = new RegExp(
		`${ENGINE.service}:[\\s\\S]*?networks:[\\s\\S]*?- anxion-engines-sandbox`,
	).test(raw);
	const imagePinned = ENGINE.imagePattern.test(raw);
	return {
		servicePresent,
		readOnlyPresent,
		sandboxNetworkOnly,
		imagePinned,
		composeOk:
			servicePresent && readOnlyPresent && sandboxNetworkOnly && imagePinned,
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
	const networks = Object.keys(parsed.NetworkSettings?.Networks ?? {});
	const logConfig = parsed.HostConfig?.LogConfig ?? {};
	return {
		ok: true,
		nonRoot: user === "10001" || user.startsWith("10001:"),
		readOnlyRootfs,
		loggingDriver: logConfig.Type ?? "unknown",
		networks,
		onSandboxNetwork:
			networks.includes("docker_anxion-engines-sandbox") ||
			networks.includes("anxion-engines-sandbox"),
	};
}

function probeStructuredLogs(service) {
	const logs = run("docker", ["logs", `docker-${service}-1`, "--tail", "20"]);
	if (!logs.ok) {
		return { ok: false, error: logs.stderr.trim() || "logs failed" };
	}
	const lines = logs.stdout
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const parsed = lines
		.map((line) => parseSandboxLogLine(line))
		.filter((entry) => entry !== null);
	return {
		ok: parsed.some((entry) => entry.event === "sandbox.started"),
		parsedCount: parsed.length,
	};
}

function captureImageDigest(engine) {
	const inspect = run("docker", [
		"image",
		"inspect",
		engine.image,
		"--format",
		"{{index .RepoDigests 0}}",
	]);
	if (!inspect.ok || !inspect.stdout.trim()) {
		return { ok: false, error: inspect.stderr.trim() || "no digest" };
	}
	const full = inspect.stdout.trim();
	const match = full.match(/sha256:[a-f0-9]{64}/i);
	return {
		ok: Boolean(match),
		digest: match?.[0] ?? null,
		repoDigest: full,
	};
}

async function main() {
	const opts = parseCli(process.argv.slice(2));
	const staticReport = inspectComposeStatic();
	const report = {
		issue: opts.issue,
		engine: ENGINE.engineId,
		service: ENGINE.service,
		version: SANDBOX_VERSION,
		static: staticReport,
		build: null,
		up: null,
		health: { docker: null, http: null },
		auth: null,
		runtime: null,
		logs: null,
		restart: null,
		imageDigest: null,
		overallOk: false,
	};

	if (!staticReport.composeOk) {
		if (opts.json) {
			console.log(JSON.stringify(report, null, 2));
		} else {
			console.error("ANX-180 homologation FAILED: compose static checks");
			console.error(JSON.stringify(staticReport, null, 2));
		}
		process.exit(1);
	}

	if (!opts["skip-build"]) {
		const build = compose(["build", ENGINE.service]);
		report.build = { ok: build.ok, exitCode: build.status };
		if (!build.ok) {
			if (opts.json) console.log(JSON.stringify(report, null, 2));
			else console.error("ANX-180 homologation FAILED: docker build");
			process.exit(1);
		}
	} else {
		report.build = { skipped: true };
	}

	const up = compose(["up", "-d", ENGINE.service]);
	report.up = { ok: up.ok, exitCode: up.status };
	if (!up.ok) {
		if (opts.json) console.log(JSON.stringify(report, null, 2));
		else console.error("ANX-180 homologation FAILED: docker up");
		process.exit(1);
	}

	report.health.docker = await waitForHealthy(ENGINE.service);
	report.health.http = probeHealthHttp(ENGINE);
	report.runtime = inspectRuntimeSecurity(ENGINE.service);
	report.logs = probeStructuredLogs(ENGINE.service);
	report.imageDigest = captureImageDigest(ENGINE);

	const authToken =
		process.env.ENGINE_SANDBOX_AUTH_TOKEN ?? "dev-sandbox-auth-local-only";
	report.auth = probeApiAuth(ENGINE, authToken);

	if (!opts["skip-restart"]) {
		const restart = compose(["restart", ENGINE.service]);
		const afterRestart = await waitForHealthy(ENGINE.service);
		const httpAfter = probeHealthHttp(ENGINE);
		report.restart = {
			commandOk: restart.ok,
			healthyAfter: afterRestart.ok,
			httpOkAfter: httpAfter.ok,
		};
	} else {
		report.restart = { skipped: true };
	}

	const runtimeOk = Boolean(
		report.runtime?.ok &&
			report.runtime.nonRoot &&
			report.runtime.readOnlyRootfs &&
			report.runtime.onSandboxNetwork &&
			report.runtime.loggingDriver === "json-file",
	);

	report.overallOk = Boolean(
		staticReport.composeOk &&
			(opts["skip-build"] || report.build?.ok) &&
			report.up?.ok &&
			report.health.docker?.ok &&
			report.health.http?.ok &&
			runtimeOk &&
			report.logs?.ok &&
			report.auth?.rejectsWithoutAuth &&
			report.auth?.acceptsWithAuth &&
			(opts["skip-restart"] ||
				(report.restart?.commandOk &&
					report.restart?.healthyAfter &&
					report.restart?.httpOkAfter)),
	);

	if (opts.json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(
			`ANX-180 MT5 sandbox homologation: ${report.overallOk ? "PASS" : "FAIL"}`,
		);
		console.log(JSON.stringify(report, null, 2));
	}

	process.exit(report.overallOk ? 0 : 1);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
