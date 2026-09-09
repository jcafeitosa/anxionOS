/**
 * Testes do CLI compliance-check — evaluateCompliance (unit) + MODES.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MODES,
  evaluateCompliance,
  evaluateExecutorCriticPairing,
  agentsMdExists,
  scopeMdExists,
  evaluateDialogueDisplayWarnings,
  evaluateDialogueDisplayViolations,
  evaluateToolingWarnings,
  graphifyIndexExists,
} from "../agent-compliance/compliance-lib.mjs";

const baseInput = {
  persona: "orchestrator",
  issueId: "ANX-134",
  mode: "full",
  taskboardOk: true,
  issue: { identifier: "ANX-134", status: "in_progress" },
  session: {
    persona: "orchestrator",
    issueId: "ANX-134",
    startedAt: new Date().toISOString(),
    lastDialogueAt: new Date().toISOString(),
  },
  workflow: {
    step: "implement",
    checklist: {
      agentsMdRead: true,
      taskboardEnsure: true,
      scopeAcknowledged: true,
      sessionStarted: true,
      ackPosted: true,
    },
  },
  dialogue: {
    hasAck: true,
    hasStatus: true,
    handoffReceived: false,
    verdictPosted: false,
  },
};

test("MODES inclui full, pre-work, pre-commit", () => {
  assert.deepEqual(MODES, ["full", "pre-work", "pre-commit"]);
});

test("agentsMdExists e scopeMdExists retornam boolean", () => {
  assert.equal(typeof agentsMdExists(), "boolean");
  assert.equal(typeof scopeMdExists(), "boolean");
});

test("evaluateCompliance passa com input completo mockado", () => {
  const result = evaluateCompliance(baseInput);
  assert.equal(result.compliant, true);
  assert.equal(result.violations.length, 0);
});

test("evaluateCompliance falha taskboard offline", () => {
  const result = evaluateCompliance({ ...baseInput, taskboardOk: false });
  assert.equal(result.compliant, false);
  assert.ok(result.violations.some((v) => v.code === "TASKBOARD_OFFLINE"));
  assert.ok(result.violations[0].fix.includes("taskboard:ensure"));
});

test("evaluateCompliance falha issue nao in_progress em pre-work", () => {
  const result = evaluateCompliance({
    ...baseInput,
    mode: "pre-work",
    issue: { status: "todo" },
  });
  assert.equal(result.compliant, false);
  assert.ok(result.violations.some((v) => v.code === "ISSUE_NOT_IN_PROGRESS"));
});

test("evaluateCompliance falha sem sessao em mode full", () => {
  const result = evaluateCompliance({ ...baseInput, session: null });
  assert.equal(result.compliant, false);
  assert.ok(result.violations.some((v) => v.code === "NO_SESSION"));
  assert.ok(result.violations.find((v) => v.code === "NO_SESSION").fix.includes("orchestration:session"));
});

test("evaluateCompliance falha scope nao confirmado", () => {
  const result = evaluateCompliance({
    ...baseInput,
    workflow: {
      ...baseInput.workflow,
      checklist: { ...baseInput.workflow.checklist, scopeAcknowledged: false },
    },
  });
  assert.equal(result.compliant, false);
  assert.ok(result.violations.some((v) => v.code === "SCOPE"));
});

test("violation inclui fix command acionavel", () => {
  const result = evaluateCompliance({ ...baseInput, taskboardOk: false });
  for (const v of result.violations) {
    assert.ok(v.fix.length > 5, `fix vazio para ${v.code}`);
  }
});

test("evaluateToolingWarnings retorna array", () => {
  const warnings = evaluateToolingWarnings();
  assert.ok(Array.isArray(warnings));
  for (const w of warnings) {
    assert.ok(w.code);
    assert.ok(w.fix);
  }
});

test("evaluateDialogueDisplayWarnings retorna array", () => {
  const warnings = evaluateDialogueDisplayWarnings();
  assert.ok(Array.isArray(warnings));
  for (const w of warnings) {
    assert.ok(w.code);
    assert.ok(w.fix);
  }
});

test("evaluateDialogueDisplayViolations ignora fora de pre-commit orchestrator", () => {
  assert.equal(evaluateDialogueDisplayViolations("backend-executor", "pre-commit").length, 0);
  assert.equal(evaluateDialogueDisplayViolations("orchestrator", "full").length, 0);
});

test("evaluateCompliance inclui warnings", () => {
  const result = evaluateCompliance(baseInput);
  assert.ok(Array.isArray(result.warnings));
});

test("evaluateExecutorCriticPairing ignora nao-executor", () => {
  const violations = evaluateExecutorCriticPairing("orchestrator", "ANX-134", null, "pre-work");
  assert.equal(violations.length, 0);
});

test("evaluateExecutorCriticPairing falha sem sessao do critico", () => {
  const violations = evaluateExecutorCriticPairing(
    "backend-executor",
    "ANX-999",
    { persona: "backend-executor", issueId: "ANX-999", criticSlug: "backend-critic" },
    "pre-work",
  );
  assert.ok(violations.some((v) => v.code === "MISSING_CRITIC_PAIR"));
  assert.ok(violations[0].fix.includes("backend-critic"));
});

test("evaluateCompliance pre-work falha executor sem critico pareado", () => {
  const result = evaluateCompliance({
    ...baseInput,
    persona: "backend-executor",
    mode: "pre-work",
    session: { persona: "backend-executor", issueId: "ANX-134", startedAt: new Date().toISOString() },
  });
  assert.equal(result.compliant, false);
  assert.ok(result.violations.some((v) => v.code === "MISSING_CRITIC_PAIR"));
});
