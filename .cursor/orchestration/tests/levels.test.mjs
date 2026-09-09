/**
 * Testes de hierarquia hire — levels.mjs canHire.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { canHire, EXECUTOR_CRITIC_PAIR, ORCHESTRATOR_CRITIC_PAIR, getCursorSubagentType, HIRE_AUTHORITY } from "../agent-hire/levels.mjs";

test("backend-executor não pode contratar code-review-lead (Level B)", () => {
  const result = canHire("backend-executor", "code-review-lead", "ANX-222");
  assert.equal(result.allowed, false);
  assert.match(result.error ?? "", /Level C|lead|pareado/i);
});

test("backend-executor pode contratar worker do domínio", () => {
  const result = canHire("backend-executor", "build-error-resolver", "ANX-222");
  assert.equal(result.allowed, true);
  assert.equal(result.targetType, "worker");
});

test("backend-executor pode contratar crítico pareado", () => {
  const critic = EXECUTOR_CRITIC_PAIR["backend-executor"];
  const result = canHire("backend-executor", critic, "ANX-222");
  assert.equal(result.allowed, true);
  assert.equal(result.targetType, "critic-pair");
});

test("backend-critic não pode contratar diretamente", () => {
  const result = canHire("backend-critic", "build-error-resolver", "ANX-222");
  assert.equal(result.allowed, false);
  assert.match(result.error ?? "", /Crítico Level C/i);
});

test("orchestrator (Level A) pode contratar qualquer alvo", () => {
  const result = canHire("orchestrator", "code-review-lead", "ANX-222");
  assert.equal(result.allowed, true);
  assert.equal(result.level, "center");
});

test("HIRE_AUTHORITY define limites por nível", () => {
  assert.deepEqual(HIRE_AUTHORITY.center, ["specialist", "worker", "critic", "lead", "executor"]);
  assert.deepEqual(HIRE_AUTHORITY.A, ["specialist", "worker", "critic", "lead", "executor"]);
  assert.deepEqual(HIRE_AUTHORITY.B, ["specialist", "worker"]);
  assert.deepEqual(HIRE_AUTHORITY.C, ["worker", "critic-pair"]);
});

test("getCursorSubagentType mapeia workers e personas", () => {
  assert.equal(getCursorSubagentType("build-error-resolver"), "build-error-resolver");
  assert.equal(getCursorSubagentType("security-reviewer"), "security-review");
  assert.equal(getCursorSubagentType("backend-executor"), "generalPurpose");
  assert.equal(getCursorSubagentType("code-review-lead"), "code-reviewer");
  assert.equal(getCursorSubagentType("unknown-slug"), null);
});

test("ORCHESTRATOR_CRITIC_PAIR mapeia Renata para cto-critic", () => {
  assert.equal(ORCHESTRATOR_CRITIC_PAIR.orchestrator, "cto-critic");
});
