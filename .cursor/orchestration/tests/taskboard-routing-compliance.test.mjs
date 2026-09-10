/**
 * Testes compliance gate com dual-board scope.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

test("evaluateTaskboardViolations framework skip dashi in_progress", async () => {
  const { evaluateTaskboardViolations } = await import("../agent-compliance/taskboard-gate.mjs");
  process.env.CURSOR_GOAL_ID = "test-goal-framework";
  const violations = evaluateTaskboardViolations({
    issueId: "ANX-240",
    issue: { status: "todo" },
    persona: "orchestrator",
    mode: "pre-work",
    taskboardOk: false,
    scope: "framework",
  });
  assert.ok(!violations.some((v) => v.code === "ISSUE_NOT_IN_PROGRESS"));
  assert.ok(!violations.some((v) => v.code === "TASKBOARD_OFFLINE"));
  delete process.env.CURSOR_GOAL_ID;
});

test("evaluateTaskboardViolations framework falha sem CURSOR_GOAL_ID", async () => {
  const { evaluateTaskboardViolations } = await import("../agent-compliance/taskboard-gate.mjs");
  const prev = process.env.CURSOR_GOAL_ID;
  delete process.env.CURSOR_GOAL_ID;
  delete process.env.CURSOR_TASKBOARD_GOAL;
  delete process.env.DIALOGUE_FROM_PERSONA;
  delete process.env.PROACTIVE_PERSONA;
  const { loadGoalsRegistry, saveGoalsRegistry } = await import("../agent-config/taskboard-routing.mjs");
  const backup = loadGoalsRegistry();
  saveGoalsRegistry({ version: 1, updatedAt: new Date().toISOString(), goals: [] });
  const violations = evaluateTaskboardViolations({
    issueId: "ANX-240",
    issue: { status: "todo" },
    persona: "orchestrator",
    mode: "pre-work",
    taskboardOk: true,
    scope: "framework",
  });
  assert.ok(violations.some((v) => v.code === "CURSOR_GOAL_MISSING"));
  saveGoalsRegistry(backup);
  if (prev) process.env.CURSOR_GOAL_ID = prev;
});
