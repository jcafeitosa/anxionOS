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
  evaluateCoordinatorMonologueWarnings,
  evaluateHierarchyProxyAnswerWarnings,
  evaluatePersonaRoboticWarnings,
  graphifyIndexExists,
  evaluateTaskboardViolations,
  evaluateBrainConsultationWarnings,
  evaluateCapabilitiesUnderusedWarnings,
  evaluateDoneWithReservationsWarnings,
} from "../agent-compliance/compliance-lib.mjs";
import { detectReservationsInCorpus } from "../agent-proactive/cto-evidence.mjs";
import {
  acquireIssueLock,
  releaseIssueLock,
} from "../agent-workflow/issue-coordination.mjs";

const THREAD_Z21_COMPLIANCE = "cursor-test-compliance-z21";
const ISSUE_Z21_COMPLIANCE = "ANX-TEST-COMPLIANCE-Z21";

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

test("evaluateCapabilitiesUnderusedWarnings exportado e retorna array", () => {
  const warnings = evaluateCapabilitiesUnderusedWarnings({
    persona: "orchestrator",
    mode: "pre-work",
    issueId: "ANX-1",
    session: null,
  });
  assert.ok(Array.isArray(warnings));
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


test("evaluateCoordinatorMonologueWarnings ignora executor", () => {
  const warnings = evaluateCoordinatorMonologueWarnings("backend-executor");
  assert.equal(warnings.length, 0);
});

test("evaluateCoordinatorMonologueWarnings avisa orchestrator", () => {
  const warnings = evaluateCoordinatorMonologueWarnings("orchestrator");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "COORDINATOR_MONOLOGUE");
  assert.ok(warnings[0].fix.includes("orchestration:chat"));
});

test("evaluatePersonaRoboticWarnings ignora texto com @mention", () => {
  const warnings = evaluatePersonaRoboticWarnings(
    "@lucas — rodei migrate e parei no FK; proximo passo?",
  );
  assert.equal(warnings.length, 0);
});

test("evaluatePersonaRoboticWarnings avisa bullets genericos sem mention", () => {
  const text = [
    "- Item one completed",
    "- Item two completed",
    "- Item three completed",
    "- Summary of work done",
  ].join("\n");
  const warnings = evaluatePersonaRoboticWarnings(text);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "PERSONA_ROBOTIC");
  assert.ok(warnings[0].fix.includes("PERSONA-VOICE.md"));
});

test("evaluatePersonaRoboticWarnings avisa opener generico de assistant", () => {
  const warnings = evaluatePersonaRoboticWarnings(
    "As an AI assistant, I have completed the requested framework updates successfully.",
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "PERSONA_ROBOTIC");
});

test("evaluatePersonaRoboticWarnings ignora bloco persona", () => {
  const text = `---
**Lucas Mendes** · executor · [backend-executor] · execução
@marina — ack. Pacote G0 na issue antes de codar.
---`;
  assert.equal(evaluatePersonaRoboticWarnings(text).length, 0);
});

test("evaluateCompliance inclui DELEGATION_NO_FEEDBACK quando stale", () => {
  const old = new Date(Date.now() - 15 * 60_000).toISOString();
  const result = evaluateCompliance({
    ...baseInput,
    persona: "backend-executor",
    issueId: "ANX-135",
    issue: { identifier: "ANX-135", status: "in_progress" },
    session: {
      persona: "backend-executor",
      issueId: "ANX-135",
      startedAt: old,
      lastDialogueAt: old,
    },
    workflow: {
      ...baseInput.workflow,
      checklist: { ...baseInput.workflow.checklist, ackPosted: true },
    },
    dialogue: { hasAck: true, hasStatus: false },
  });
  assert.ok(result.warnings.some((w) => w.code === "DELEGATION_NO_FEEDBACK"));
});


test("evaluateTaskboardViolations bloqueia sem issue em pre-work", () => {
  const violations = evaluateTaskboardViolations({
    issueId: null,
    issue: null,
    persona: "backend-executor",
    mode: "pre-work",
    taskboardOk: true,
  });
  assert.ok(violations.some((v) => v.code === "MISSING_ISSUE_ID"));
  assert.ok(violations.some((v) => v.code === "WORK_WITHOUT_BOARD_ISSUE"));
});

test("evaluateCompliance pre-work bloqueia issue ausente", () => {
  const result = evaluateCompliance({
    ...baseInput,
    mode: "pre-work",
    issueId: null,
    issue: null,
    persona: "backend-executor",
  });
  assert.equal(result.compliant, false);
  assert.ok(result.violations.some((v) => v.code === "MISSING_ISSUE_ID"));
});

test("evaluateHierarchyProxyAnswerWarnings ignora executor", () => {
  const warnings = evaluateHierarchyProxyAnswerWarnings("backend-executor", {
    text: "Rodei bun test e temos 847 testes passando no backend.",
  });
  assert.equal(warnings.length, 0);
});

test("evaluateHierarchyProxyAnswerWarnings avisa orchestrator sem evidencia", () => {
  const warnings = evaluateHierarchyProxyAnswerWarnings("orchestrator", {
    text: "Temos cerca de 800 testes no backend, todos passando apos o migrate.",
  });
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "HIERARCHY_PROXY_ANSWER");
  assert.ok(warnings[0].fix.includes("QUESTION-HIERARCHY.md"));
});

test("evaluateHierarchyProxyAnswerWarnings ignora roteamento com @mention", () => {
  const warnings = evaluateHierarchyProxyAnswerWarnings("orchestrator", {
    text: "@marina — @Owner pergunta contagem de testes backend. Delego resposta ao par backend.",
  });
  assert.equal(warnings.length, 0);
});

test("evaluateHierarchyProxyAnswerWarnings ignora nao verificado", () => {
  const warnings = evaluateHierarchyProxyAnswerWarnings("orchestrator", {
    text: "Nao verificado neste turno — peça ao Lucas rodar bun test no backend.",
  });
  assert.equal(warnings.length, 0);
});

test("evaluateHierarchyProxyAnswerWarnings ignora resposta com command evidence", () => {
  const warnings = evaluateHierarchyProxyAnswerWarnings("orchestrator", {
    text: "@Owner — backend tests ok. evidence: command:cd backend && bun test 2>&1 | tail -3",
  });
  assert.equal(warnings.length, 0);
});

test("evaluateBrainConsultationWarnings integrado em pre-work executor", () => {
  const warnings = evaluateBrainConsultationWarnings({
    persona: "backend-executor",
    mode: "pre-work",
    issue: { description: "codar sem fonte" },
  });
  assert.ok(warnings.some((w) => w.code === "BRAIN_NOT_CONSULTED"));
});

test("detectReservationsInCorpus flags ressalvas and open follow-ups", () => {
  const hits = detectReservationsInCorpus("done COM RESSALVAS — ANX-243 MEDIUM pendente");
  assert.ok(hits.length >= 1);
});

test("evaluateDoneWithReservationsWarnings on done issue with ressalvas", () => {
  const warnings = evaluateDoneWithReservationsWarnings(
    { status: "done" },
    [{ body: "aceite com ressalvas MEDIUM pendente" }],
  );
  assert.ok(warnings.some((w) => w.code === "DONE_WITH_RESERVATIONS"));
});

test("evaluateCompliance pre-work falha sem issue lock (Z21)", () => {
  const prev = process.env.CURSOR_THREAD_ID;
  process.env.CURSOR_THREAD_ID = THREAD_Z21_COMPLIANCE;
  try {
    releaseIssueLock(ISSUE_Z21_COMPLIANCE, THREAD_Z21_COMPLIANCE, { force: true });
    const result = evaluateCompliance({
      ...baseInput,
      mode: "pre-work",
      issueId: ISSUE_Z21_COMPLIANCE,
      issue: { identifier: ISSUE_Z21_COMPLIANCE, status: "in_progress" },
      session: {
        persona: "orchestrator",
        issueId: ISSUE_Z21_COMPLIANCE,
        threadId: THREAD_Z21_COMPLIANCE,
        startedAt: new Date().toISOString(),
        lastDialogueAt: new Date().toISOString(),
      },
    });
    assert.equal(result.compliant, false);
    assert.ok(result.violations.some((v) => v.code === "MISSING_ISSUE_LOCK"));
  } finally {
    releaseIssueLock(ISSUE_Z21_COMPLIANCE, THREAD_Z21_COMPLIANCE, { force: true });
    process.env.CURSOR_THREAD_ID = prev;
  }
});

test("evaluateCompliance pre-work nao emite MISSING_ISSUE_LOCK com lock ativo (Z21)", () => {
  const prev = process.env.CURSOR_THREAD_ID;
  process.env.CURSOR_THREAD_ID = THREAD_Z21_COMPLIANCE;
  try {
    releaseIssueLock(ISSUE_Z21_COMPLIANCE, THREAD_Z21_COMPLIANCE, { force: true });
    acquireIssueLock(ISSUE_Z21_COMPLIANCE, "orchestrator");
    const result = evaluateCompliance({
      ...baseInput,
      mode: "pre-work",
      issueId: ISSUE_Z21_COMPLIANCE,
      issue: { identifier: ISSUE_Z21_COMPLIANCE, status: "in_progress" },
      session: {
        persona: "orchestrator",
        issueId: ISSUE_Z21_COMPLIANCE,
        threadId: THREAD_Z21_COMPLIANCE,
        startedAt: new Date().toISOString(),
        lastDialogueAt: new Date().toISOString(),
      },
    });
    assert.ok(!result.violations.some((v) => v.code === "MISSING_ISSUE_LOCK"));
  } finally {
    releaseIssueLock(ISSUE_Z21_COMPLIANCE, THREAD_Z21_COMPLIANCE, { force: true });
    process.env.CURSOR_THREAD_ID = prev;
  }
});
