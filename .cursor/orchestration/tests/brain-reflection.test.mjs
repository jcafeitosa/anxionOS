/**
 * Tests — OpenKnowledge brain loop (reflection staging + compliance warnings).
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  appendReflection,
  evaluateBrainConsultationWarnings,
  evaluateReflectionPendingWarnings,
  hasBrainReference,
  listReflections,
  reflectionsPath,
} from "../agent-brain/brain-reflection.mjs";

test("hasBrainReference detecta brain/ e pacote G0", () => {
  assert.equal(hasBrainReference("source: brain/notes/foo.md"), true);
  assert.equal(hasBrainReference("pacote G0 sem path"), true);
  assert.equal(hasBrainReference("implementar sem contexto"), false);
});

test("appendReflection e listReflections por issue", () => {
  const dir = mkdtempSync(join(tmpdir(), "anx-brain-"));
  const options = { runtimeRoot: dir };
  const record = appendReflection(
    { issueId: "ANX-TEST", outcome: "pass", lesson: "lição sintética", persona: "backend-executor" },
    options,
  );
  assert.equal(record.issueId, "ANX-TEST");
  assert.match(record.ts, /^\d{4}-\d{2}-\d{2}T/);
  const rows = listReflections({ issueId: "ANX-TEST" }, options);
  assert.equal(rows.length, 1);
  assert.equal(reflectionsPath(options).endsWith("brain-reflections.jsonl"), true);
  rmSync(dir, { recursive: true, force: true });
});

test("evaluateBrainConsultationWarnings emite BRAIN_NOT_CONSULTED para executor", () => {
  const warnings = evaluateBrainConsultationWarnings({
    persona: "backend-executor",
    mode: "pre-work",
    issue: { description: "implementar feature X" },
  });
  assert.ok(warnings.some((w) => w.code === "BRAIN_NOT_CONSULTED"));
});

test("evaluateBrainConsultationWarnings silencioso com referencia brain/", () => {
  const warnings = evaluateBrainConsultationWarnings({
    persona: "backend-executor",
    mode: "pre-work",
    issue: { description: "source: brain/project-docs/specs/001-institutional-contract/spec.md" },
  });
  assert.equal(warnings.length, 0);
});

test("evaluateReflectionPendingWarnings silencioso fora de in_review", () => {
  const warnings = evaluateReflectionPendingWarnings({
    persona: "backend-executor",
    mode: "full",
    issueId: "ANX-777",
    issue: { status: "in_progress" },
  });
  assert.equal(warnings.length, 0);
});
