/**
 * Testes taskboard routing — scope inference e board selection.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  boardTypeForScope,
  inferScopeFromIssue,
  inferScopeFromPaths,
  isFrameworkPath,
  isProjectPath,
  resolveTaskboardRouting,
} from "../agent-config/taskboard-routing.mjs";

test("isProjectPath detecta backend e frontend", () => {
  assert.equal(isProjectPath("backend/modules/foo.ts"), true);
  assert.equal(isProjectPath("frontend/src/App.tsx"), true);
  assert.equal(isFrameworkPath(".cursor/orchestration/foo.mjs"), true);
});

test("inferScopeFromPaths classifica project vs framework", () => {
  const project = inferScopeFromPaths(["backend/apps/api/src/index.ts"]);
  assert.equal(project.scope, "project");

  const framework = inferScopeFromPaths([".cursor/orchestration/agent-compliance/compliance-lib.mjs"]);
  assert.equal(framework.scope, "framework");

  const mixed = inferScopeFromPaths(["backend/foo.ts", ".cursor/rules/foo.mdc"]);
  assert.equal(mixed.scope, null);
  assert.equal(mixed.mixed, true);
});

test("inferScopeFromIssue ANX-135 project e ANX-240 framework", () => {
  assert.equal(inferScopeFromIssue("ANX-135").scope, "project");
  assert.equal(inferScopeFromIssue("ANX-240").scope, "framework");
});

test("resolveTaskboardRouting mapeia scope para board", () => {
  const project = resolveTaskboardRouting({ scope: "project", issueId: "ANX-135" });
  assert.equal(project.board, "dashi");

  const framework = resolveTaskboardRouting({ scope: "framework", issueId: "ANX-240" });
  assert.equal(framework.board, "cursor");
});

test("boardTypeForScope respeita config", () => {
  assert.equal(boardTypeForScope("project"), "dashi");
  assert.equal(boardTypeForScope("framework"), "cursor");
});

test("auto scope from paths framework-only", () => {
  const routing = resolveTaskboardRouting({
    scope: "auto",
    changedPaths: [".cursor/orchestration/TASKBOARD-ROUTING.md"],
  });
  assert.equal(routing.scope, "framework");
  assert.equal(routing.board, "cursor");
});
