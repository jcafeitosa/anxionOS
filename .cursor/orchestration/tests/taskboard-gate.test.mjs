import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedIssueStatus, evaluateTaskboardViolations } from "../agent-compliance/taskboard-gate.mjs";

test("isAllowedIssueStatus permite orchestrator in_review em pre-commit handoff", () => {
  assert.equal(
    isAllowedIssueStatus({
      persona: "orchestrator",
      mode: "pre-commit",
      issueStatus: "in_review",
      gateHandoff: true,
    }),
    true,
  );
});

test("isAllowedIssueStatus bloqueia executor in_review", () => {
  assert.equal(
    isAllowedIssueStatus({
      persona: "backend-executor",
      mode: "pre-work",
      issueStatus: "in_review",
      gateHandoff: false,
    }),
    false,
  );
});

test("evaluateTaskboardViolations bloqueia issue nao encontrada", () => {
  const violations = evaluateTaskboardViolations({
    issueId: "ANX-99999",
    issue: null,
    persona: "orchestrator",
    mode: "pre-work",
    taskboardOk: true,
  });
  assert.ok(violations.some((v) => v.code === "ISSUE_NOT_FOUND"));
});
