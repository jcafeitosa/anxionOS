/**
 * Smoke tests — orchestration:brain CLI
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const cli = ".cursor/orchestration/agent-brain/brain-cli.mjs";

test("brain CLI --help exit 0", () => {
  const r = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /OpenKnowledge brain loop/);
});

test("brain search imprime padrao MCP", () => {
  const r = spawnSync(process.execPath, [cli, "search", "--query", "organizations"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /user-open-knowledge MCP/);
});
