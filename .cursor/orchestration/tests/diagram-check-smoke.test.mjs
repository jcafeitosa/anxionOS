/**
 * Smoke test — diagram-check workflows N/N OK.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const diagramCheck = join(repoRoot, ".cursor/orchestration/agent-workflow/diagram-check.mjs");

test("diagram-check: all workflow files OK", () => {
  const result = spawnSync(process.execPath, [diagramCheck], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `diagram-check falhou:
${result.stderr}
${result.stdout}`,
  );
  const match = result.stdout.match(/Workflow files OK:\s+(\d+)\/(\d+)/);
  assert.ok(match, `expected Workflow files OK line in output:\n${result.stdout}`);
  assert.equal(match[1], match[2], `workflow count mismatch: ${match[1]}/${match[2]}`);
});
