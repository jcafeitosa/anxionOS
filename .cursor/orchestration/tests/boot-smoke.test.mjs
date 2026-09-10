/**
 * Smoke test — orchestration:boot
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const boot = join(repoRoot, ".cursor/orchestration/agent-workflow/boot.mjs");

test("boot --help exit 0", () => {
  const result = spawnSync(process.execPath, [boot, "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /orchestration:boot/);
});

test("boot --skip-taskboard --json retorna steps", () => {
  const result = spawnSync(process.execPath, [boot, "--skip-taskboard", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.ok(Array.isArray(payload.steps));
  assert.ok(payload.steps.some((s) => s.name === "orchestration:proactive"));
});
