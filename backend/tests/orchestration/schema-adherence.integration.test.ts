import { describe, expect, test } from "bun:test";
import {
	getDatabaseUrl,
	shouldRunPgIntegrationTests,
} from "../pg-harness-guard";

describe("orchestration schema adherence (ANX-470)", () => {
	test("real repositories and all eight tables pass in an isolated process", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = getDatabaseUrl();
		if (!url) return;
		const worker = Bun.spawn(
			["bun", "run", "tests/orchestration/schema-adherence.worker.ts"],
			{
				env: { ...process.env, DATABASE_URL: url },
				stdout: "pipe",
				stderr: "pipe",
			},
		);
		const [exitCode, stdout, stderr] = await Promise.all([
			worker.exited,
			new Response(worker.stdout).text(),
			new Response(worker.stderr).text(),
		]);
		expect(exitCode).toBe(0);
		expect(stdout).toContain("ORCHESTRATION_ADHERENCE_OK");
		expect(stderr).toBe("");
	});
});
