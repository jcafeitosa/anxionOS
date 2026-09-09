/**
 * Testes de competência — roster-lookup can-i.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { canDoAction } from "../agent-dialogue/roster-lookup.mjs";

test("backend-executor não pode implementar frontend", () => {
  const result = canDoAction(
    "backend-executor",
    "implementar componente frontend em frontend/src",
  );
  assert.equal(result.allowed, false);
  assert.equal(result.owner, "frontend-executor");
  assert.match(result.reason, /frontend/i);
});

test("backend-executor pode implementar backend", () => {
  const result = canDoAction(
    "backend-executor",
    "implementar módulo backend/modules/accounting",
  );
  assert.equal(result.allowed, true);
  assert.equal(result.owner, "backend-executor");
});

test("frontend-executor não pode implementar backend", () => {
  const result = canDoAction(
    "frontend-executor",
    "implementar backend/modules/identity",
  );
  assert.equal(result.allowed, false);
  assert.equal(result.owner, "backend-executor");
});


test("backend-executor pode editar framework workflow do domínio backend", () => {
  const result = canDoAction("backend-executor", "edit framework workflow");
  assert.equal(result.allowed, true);
  assert.match(result.reason, /backend/i);
  assert.match(result.suggestion, /orchestration:verify/i);
});

test("backend-executor não pode editar workflow frontend sem consult", () => {
  const result = canDoAction(
    "backend-executor",
    "edit workflow-frontend-executor.md framework",
  );
  assert.equal(result.allowed, false);
  assert.equal(result.owner, "frontend-executor");
});

test("backend-executor não pode editar HIERARCHY.md (política global)", () => {
  const result = canDoAction(
    "backend-executor",
    "edit HIERARCHY.md framework policy",
  );
  assert.equal(result.allowed, false);
  assert.equal(result.owner, "orchestrator");
  assert.match(result.reason, /global|núcleo/i);
});

test("orchestrator não tem autonomia Level C de framework", () => {
  const result = canDoAction("orchestrator", "edit framework workflow");
  assert.equal(result.allowed, false);
});
