/**
 * Smoke test — diagram-check workflows 34/34 OK.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const diagramCheck = join(repoRoot, ".cursor/orchestration/agent-workflow/diagram-check.mjs");

test("diagram-check: workflows 34/34 OK", () => {
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
  assert.match(result.stdout, /Workflow files OK:\s+34\/34/);
});
