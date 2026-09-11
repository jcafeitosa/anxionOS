#!/usr/bin/env bun
/**
 * ANX-144 S1 — OpenBot sandbox homologation wrapper.
 * Mirrors research/openbot-homologation-runbook.md with fail-closed env policy.
 *
 * Default: SKIP_OPENBOT_E2E=1 (or unset) → skip upstream E2E, exit 0 with skipped report.
 * When SKIP_OPENBOT_E2E=0: requires INTELLIGENCE_API_URL + INTELLIGENCE_API_KEY.
 */
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import {
	getOpenBotHomologationSkipReason,
	resolveOpenBotHomologationPolicy,
} from "../packages/contracts/src/openbot/env-policy.ts";

function parseCli(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			issue: { type: "string", default: "ANX-144" },
			json: { type: "boolean", default: false },
			"run-fixtures": { type: "boolean", default: true },
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
	const policy = resolveOpenBotHomologationPolicy(process.env);
	const skipReason = getOpenBotHomologationSkipReason(process.env);

	const report = {
		issue: opts.issue,
		timestamp: new Date().toISOString(),
		policy,
		fixtureTests: null,
		upstream: {
			mode: "skipped",
			reason: skipReason,
		},
		overallOk: true,
	};

	if (opts["run-fixtures"]) {
		const fixtureTests = run("bun", ["test", "backend/tests/openbot"], {});
		report.fixtureTests = {
			ok: fixtureTests.ok,
			exitCode: fixtureTests.status,
		};
		report.overallOk = report.overallOk && fixtureTests.ok;
	}

	if (policy.canRunHomologation) {
		// Upstream oracles from runbook — operator must provide clone path via env
		const clonePath = process.env.OPENBOT_UPSTREAM_CLONE?.trim();
		if (!clonePath) {
			report.upstream = {
				mode: "blocked",
				reason:
					"OPENBOT_UPSTREAM_CLONE unset — clone CopilotKit/openbot to /tmp before live smoke",
			};
			report.overallOk = false;
		} else {
			const smokeResult = spawnSync("bun", ["test", "tests/smoke"], {
				cwd: clonePath,
				env: { ...process.env, OPENBOT_SMOKE: "1" },
				encoding: "utf8",
			});
			const smoke = {
				ok: smokeResult.status === 0,
				status: smokeResult.status ?? 1,
				stdout: smokeResult.stdout ?? "",
				stderr: smokeResult.stderr ?? "",
			};
			report.upstream = {
				mode: "live",
				clonePath,
				ok: smoke.ok,
				exitCode: smoke.status,
			};
			report.overallOk = report.overallOk && smoke.ok;
		}
	}

	if (opts.json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(`OpenBot homologation — ${opts.issue}`);
		console.log(`Policy skipE2E: ${policy.skipE2E}`);
		if (report.fixtureTests) {
			console.log(
				`Fixture tests: ${report.fixtureTests.ok ? "pass" : "fail"} (exit ${report.fixtureTests.exitCode})`,
			);
		}
		console.log(`Upstream: ${report.upstream.mode}`);
		if (report.upstream.reason) {
			console.log(`Upstream note: ${report.upstream.reason}`);
		}
	}

	process.exit(report.overallOk ? 0 : 1);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
