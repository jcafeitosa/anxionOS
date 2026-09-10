/**
 * Garante 1:1 entre PERSONA_SLUGS e workflows/workflow-{slug}.md
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PERSONA_SLUGS } from "../agent-dialogue/personas.mjs";

const orchestrationRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workflowsDir = join(orchestrationRoot, "workflows");

test("cada persona permanente tem workflow-{slug}.md", () => {
  const missing = [];
  for (const slug of PERSONA_SLUGS) {
    const path = join(workflowsDir, `workflow-${slug}.md`);
    if (!existsSync(path)) missing.push(slug);
  }
  assert.deepEqual(
    missing,
    [],
    `Workflows ausentes: ${missing.map((s) => `workflow-${s}.md`).join(", ")}`,
  );
});

test("nenhum workflow órfão fora de PERSONA_SLUGS", () => {
  const files = readdirSync(workflowsDir).filter((f) => f.startsWith("workflow-") && f.endsWith(".md"));
  const orphanSlugs = files
    .map((f) => f.replace(/^workflow-/, "").replace(/\.md$/, ""))
    .filter((slug) => !PERSONA_SLUGS.includes(slug));
  assert.deepEqual(
    orphanSlugs,
    [],
    `Workflows órfãos (sem persona): ${orphanSlugs.join(", ")}`,
  );
  assert.equal(files.length, PERSONA_SLUGS.length);
});
