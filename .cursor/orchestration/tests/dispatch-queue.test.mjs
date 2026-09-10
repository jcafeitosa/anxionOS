/**
 * Testes dispatch queue — Grok Bot → Cursor Task bridge.
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import {
  enqueueDispatch,
  listDispatches,
  markDispatched,
  markDone,
  getNextPending,
  countByStatus,
  dispatchQueuePath,
} from "../agent-delegation/dispatch-queue.mjs";
import {
  buildSpawnPlan,
  buildTaskPrompt,
  formatDispatchInjectBlock,
} from "../agent-delegation/dispatch-builder.mjs";

function withTempProject(fn) {
  const root = mkdtempSync(join(tmpdir(), "orch-dispatch-"));
  const runtime = join(root, ".cursor/orchestration-runtime");
  mkdirSync(join(runtime, "autonomy"), { recursive: true });
  mkdirSync(join(runtime, "delegation"), { recursive: true });
  const prev = process.env.ORCHESTRATION_RUNTIME_ROOT;
  process.env.ORCHESTRATION_RUNTIME_ROOT = runtime;
  try {
    return fn(root);
  } finally {
    if (prev === undefined) delete process.env.ORCHESTRATION_RUNTIME_ROOT;
    else process.env.ORCHESTRATION_RUNTIME_ROOT = prev;
  }
}

test("enqueueDispatch cria item pending com subagentType", () => {
  withTempProject((root) => {
    const item = enqueueDispatch({
      persona: "backend-executor",
      issueId: "ANX-270",
      reason: "implementar slice",
      evidence: "issue:ANX-270",
      projectRoot: root,
    });
    assert.equal(item.status, "pending");
    assert.equal(item.subagentType, "generalPurpose");
    assert.equal(item.persona, "backend-executor");
    assert.ok(existsSync(dispatchQueuePath(root)));
  });
});

test("enqueueDispatch deduplica pending igual", () => {
  withTempProject((root) => {
    const a = enqueueDispatch({
      persona: "backend-executor",
      issueId: "ANX-270",
      reason: "same",
      projectRoot: root,
    });
    const b = enqueueDispatch({
      persona: "backend-executor",
      issueId: "ANX-270",
      reason: "same",
      projectRoot: root,
    });
    assert.equal(a.id, b.id);
    const pending = listDispatches({ status: "pending", projectRoot: root });
    assert.equal(pending.length, 2);
    assert.ok(pending.some((i) => i.persona === "backend-critic"));
  });
});

test("markDispatched e markDone atualizam status", () => {
  withTempProject((root) => {
    const item = enqueueDispatch({
      persona: "code-review-lead",
      issueId: "ANX-242",
      reason: "G2 review",
      projectRoot: root,
    });
    markDispatched(item.id, "agent-123", root);
    const dispatched = getNextPending(root);
    assert.equal(dispatched, null);
    markDone(item.id, "cmd:review pass", root);
    const counts = countByStatus(root);
    assert.equal(counts.done, 1);
  });
});

test("buildTaskPrompt inclui persona e issue", () => {
  const prompt = buildTaskPrompt({
    id: "test-id",
    persona: "backend-executor",
    issueId: "ANX-270",
    reason: "test",
    evidence: "ev",
    subagentType: "generalPurpose",
    hiredBy: "orchestrator",
  });
  assert.match(prompt, /Lucas Mendes/);
  assert.match(prompt, /ANX-270/);
  assert.match(prompt, /generalPurpose/);
  assert.match(prompt, /graphify/);
});

test("enqueueDispatch auto-enfileira crítico pareado para executor", () => {
  withTempProject((root) => {
    enqueueDispatch({
      persona: "backend-executor",
      issueId: "ANX-271",
      reason: "slice backend",
      projectRoot: root,
    });
    const pending = listDispatches({ status: "pending", projectRoot: root });
    assert.equal(pending.length, 2);
    const personas = pending.map((i) => i.persona).sort();
    assert.deepEqual(personas, ["backend-critic", "backend-executor"]);
    assert.equal(pending.find((i) => i.persona === "backend-critic").subagentType, "code-reviewer");
  });
});

test("buildSpawnPlan retorna tasks com subagent_type e prompt", () => {
  const plan = buildSpawnPlan([
    {
      id: "uuid-1",
      persona: "backend-executor",
      personaName: "Lucas Mendes",
      subagentType: "generalPurpose",
      issueId: "ANX-271",
      reason: "slice",
      runInBackground: true,
      hiredBy: "orchestrator",
    },
  ]);
  assert.equal(plan.tasks.length, 1);
  assert.equal(plan.tasks[0].subagent_type, "generalPurpose");
  assert.match(plan.tasks[0].prompt, /Lucas Mendes/);
  assert.match(plan.tasks[0].afterSpawn, /mark-dispatched/);
});

test("formatDispatchInjectBlock inclui CURSOR_DISPATCH_QUEUE marker", () => {
  const block = formatDispatchInjectBlock([
    {
      id: "uuid-1",
      persona: "backend-executor",
      personaName: "Lucas Mendes",
      subagentType: "generalPurpose",
      issueId: "ANX-270",
      reason: "slice",
      runInBackground: true,
    },
  ]);
  assert.match(block, /CURSOR_DISPATCH_QUEUE/);
  assert.match(block, /Task/);
  assert.match(block, /generalPurpose/);
});
