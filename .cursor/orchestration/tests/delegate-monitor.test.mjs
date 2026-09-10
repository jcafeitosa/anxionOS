/**
 * Testes do delegate-monitor — merge, stale, formatação e warnings.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_STALE_MS,
  delegationFromHire,
  delegationFromSession,
  delegationFromWorkflow,
  evaluateDelegationFeedbackWarnings,
  formatDuration,
  formatMarkdownTable,
  isDelegationStale,
  mergeDelegations,
} from "../agent-workflow/delegate-monitor.mjs";

const now = Date.now();
const recent = new Date(now - 2 * 60_000).toISOString();
const old = new Date(now - 15 * 60_000).toISOString();

test("formatDuration formata minutos e horas", () => {
  assert.equal(formatDuration(5 * 60_000), "5min");
  assert.equal(formatDuration(90 * 60_000), "1h30min");
});

test("delegationFromSession marca stale quando sem dialogue", () => {
  const d = delegationFromSession({
    persona: "backend-executor",
    issueId: "ANX-135",
    startedAt: old,
    lastDialogueAt: null,
    threadId: "thread-1",
  });
  assert.equal(d.kind, "session");
  assert.equal(d.issueId, "ANX-135");
  assert.equal(d.stale, true);
  assert.ok(d.silentForMs >= DEFAULT_STALE_MS);
});

test("delegationFromHire inclui hireId e hiredBy", () => {
  const d = delegationFromHire({
    id: "hire-1",
    slug: "code-reviewer",
    issueId: "ANX-242",
    hiredBy: "orchestrator",
    hiredAt: recent,
    reason: "G2",
    cursorSubagentType: "code-reviewer",
    status: "active",
  });
  assert.equal(d.kind, "hire");
  assert.equal(d.hireId, "hire-1");
  assert.equal(d.subagentType, "code-reviewer");
  assert.equal(d.stale, false);
});

test("delegationFromHire stale quando hiredAt antigo", () => {
  const d = delegationFromHire({
    id: "hire-2",
    slug: "security-reviewer",
    issueId: "ANX-256",
    hiredBy: "orchestrator",
    hiredAt: old,
    status: "active",
  });
  assert.equal(d.stale, true);
});

test("delegationFromWorkflow expõe workflow step", () => {
  const d = delegationFromWorkflow({
    persona: "orchestrator",
    issueId: "ANX-240",
    step: "monitor-board",
    updatedAt: recent,
    checklist: { lastDialogueAt: recent },
  });
  assert.equal(d.workflowStep, "monitor-board");
  assert.equal(d.kind, "workflow");
});

test("mergeDelegations prefere session sobre hire", () => {
  const session = delegationFromSession({
    persona: "backend-executor",
    issueId: "ANX-135",
    startedAt: recent,
    lastDialogueAt: recent,
  });
  const hire = delegationFromHire({
    id: "h1",
    slug: "backend-executor",
    issueId: "ANX-135",
    hiredBy: "orchestrator",
    hiredAt: old,
    status: "active",
  });
  const merged = mergeDelegations([hire, session]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].kind, "session");
  assert.ok(merged[0].sources.includes("active-sessions.json"));
  assert.ok(merged[0].sources.includes("active-on-demand.json"));
});

test("formatMarkdownTable gera cabeçalho markdown", () => {
  const table = formatMarkdownTable([
    {
      issueId: "ANX-135",
      persona: "backend-executor",
      kind: "session",
      stale: false,
      silentForMs: 120_000,
      lastDialogueAt: recent,
      lastDialogueType: "status",
      workflowStep: "implement",
      board: "dashi",
      sources: ["active-sessions.json"],
    },
  ]);
  assert.match(table, /\| Issue \| Persona \| Board \| Tipo \|/);
  assert.match(table, /ANX-135/);
  assert.match(table, /backend-executor/);
});

test("isDelegationStale respeita threshold", () => {
  assert.equal(isDelegationStale({ silentForMs: DEFAULT_STALE_MS - 1 }), false);
  assert.equal(isDelegationStale({ silentForMs: DEFAULT_STALE_MS }), true);
});

test("evaluateDelegationFeedbackWarnings ignora sem sessão", () => {
  const warnings = evaluateDelegationFeedbackWarnings(
    "backend-executor",
    "ANX-135",
    null,
    { status: "in_progress" },
  );
  assert.equal(warnings.length, 0);
});

test("evaluateDelegationFeedbackWarnings emite DELEGATION_NO_FEEDBACK", () => {
  const warnings = evaluateDelegationFeedbackWarnings(
    "backend-executor",
    "ANX-135",
    {
      persona: "backend-executor",
      issueId: "ANX-135",
      startedAt: old,
      lastDialogueAt: old,
    },
    { status: "in_progress" },
    DEFAULT_STALE_MS,
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "DELEGATION_NO_FEEDBACK");
  assert.ok(warnings[0].fix.includes("orchestration:broadcast"));
});

test("evaluateDelegationFeedbackWarnings ignora issue não in_progress", () => {
  const warnings = evaluateDelegationFeedbackWarnings(
    "backend-executor",
    "ANX-135",
    { persona: "backend-executor", issueId: "ANX-135", startedAt: old, lastDialogueAt: old },
    { status: "in_review" },
  );
  assert.equal(warnings.length, 0);
});
