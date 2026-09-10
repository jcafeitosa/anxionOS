/**
 * Testes decision-tree — próxima ação por persona.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestNextAction } from "../agent-workflow/decision-tree.mjs";

test("cto-critic sugere audit G7 quando gates passam em in_review", () => {
  const next = suggestNextAction("cto-critic", "ANX-270", {
    taskboardOnline: true,
    issueStatus: "in_review",
    allGatesPass: true,
    sessionStarted: true,
  });
  assert.equal(next.action, "audit-g7-package");
  assert.match(next.command ?? "", /cto-decide/);
});

test("cto-critic não cai em notify-g2 de críticos Level C", () => {
  const next = suggestNextAction("cto-critic", "ANX-270", {
    taskboardOnline: true,
    handoffReceived: true,
    verdictPosted: true,
    verdict: "PASS",
    sessionStarted: true,
  });
  assert.notEqual(next.action, "notify-g2");
  assert.notEqual(next.handoffTo, "code-review-lead");
});

test("backend-critic PASS notifica G2", () => {
  const next = suggestNextAction("backend-critic", "ANX-270", {
    taskboardOnline: true,
    handoffReceived: true,
    verdictPosted: true,
    verdict: "PASS",
    sessionStarted: true,
  });
  assert.equal(next.action, "notify-g2");
});
