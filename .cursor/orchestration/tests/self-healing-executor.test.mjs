/**
 * ANX-279 — self-healing executor tests.
 *
 * User instruction: verify G4 gate, sandbox policy, sh-rb-002 success + rollback paths.
 * Importers: npm run orchestration:test
 * API under test: executeSelfHealingRunbook, recordG4Approval, assertSandboxEnvironment
 */
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { test } from "node:test";
import {
  assertSandboxEnvironment,
  executeSelfHealingRunbook,
  loadG4Approvals,
  recordG4Approval,
  selfHealingRuntimeDir,
} from "../agent-workflow/self-healing-executor.mjs";
import { listRunbookIds } from "../agent-workflow/self-healing-runbooks.registry.mjs";

function cleanupRuntime() {
  const { root } = selfHealingRuntimeDir();
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}

test("registry lists 3 P1 runbooks", () => {
  assert.equal(listRunbookIds().length, 3);
  assert.ok(listRunbookIds().includes("sh-rb-002-http-5xx"));
});

test("assertSandboxEnvironment blocks production", () => {
  assert.throws(() => assertSandboxEnvironment("production"), /production execution blocked/);
  assert.equal(assertSandboxEnvironment("staging"), "staging");
});

test("execute requires G4 approval", async () => {
  cleanupRuntime();
  await assert.rejects(
    () =>
      executeSelfHealingRunbook({
        runbookId: "sh-rb-002-http-5xx",
        issue: "ANX-279",
        environment: "staging",
        simulate: true,
      }),
    /G4 PASS required/,
  );
});

test("sh-rb-002 executes in staging with simulate + evidence file", async () => {
  cleanupRuntime();
  recordG4Approval({
    runbookId: "sh-rb-002-http-5xx",
    issue: "ANX-279",
    persona: "security-lead",
    evidence: "test G4",
  });

  const result = await executeSelfHealingRunbook({
    runbookId: "sh-rb-002-http-5xx",
    issue: "ANX-279",
    environment: "staging",
    simulate: true,
  });

  assert.equal(result.status, "success");
  assert.equal(result.runbookId, "sh-rb-002-http-5xx");
  assert.ok(result.steps.some((s) => s.id === "health_check" && s.status === "ok"));
  assert.equal(result.rollback.executed, false);
  assert.ok(existsSync(result.evidencePath));
  assert.equal(loadG4Approvals()["sh-rb-002-http-5xx"].verdict, "PASS");
});

test("sh-rb-002 rolls back when health probe fails", async () => {
  cleanupRuntime();
  recordG4Approval({
    runbookId: "sh-rb-002-http-5xx",
    issue: "ANX-279",
    persona: "security-lead",
  });

  const result = await executeSelfHealingRunbook({
    runbookId: "sh-rb-002-http-5xx",
    issue: "ANX-279",
    environment: "dev",
    simulate: false,
    healthProbe: async () => ({ ok: false, status: 503, url: "test://health" }),
  });

  assert.equal(result.status, "rolled_back");
  assert.equal(result.rollback.executed, true);
  assert.ok(result.rollback.steps.some((s) => s.id === "rollback_deploy_revision"));
});

test("sh-rb-001 requires DecisionRecord", async () => {
  cleanupRuntime();
  recordG4Approval({
    runbookId: "sh-rb-001-redis-pool",
    issue: "ANX-279",
    persona: "security-lead",
  });
  await assert.rejects(
    () =>
      executeSelfHealingRunbook({
        runbookId: "sh-rb-001-redis-pool",
        issue: "ANX-279",
        environment: "staging",
        simulate: true,
      }),
    /DecisionRecord id required/,
  );
});
