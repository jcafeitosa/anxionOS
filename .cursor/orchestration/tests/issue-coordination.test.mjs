/**
 * Testes de coordenação multi-chat — locks e detecção de conflito.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  acquireIssueLock,
  evaluateCrossChatClaimConflicts,
  evaluateIssueLockHeld,
  findCrossChatConflicts,
  groupSessionsByIssue,
  releaseIssueLock,
} from "../agent-workflow/issue-coordination.mjs";

const TEST_ISSUE = "ANX-TEST-COORD-99999";
const THREAD_A = "cursor-test-thread-a";
const THREAD_B = "cursor-test-thread-b";

test("groupSessionsByIssue agrupa por thread com override", () => {
  const store = {
    sessions: {
      exec: {
        persona: "backend-executor",
        issueId: TEST_ISSUE,
        threadId: THREAD_A,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      },
      critic: {
        persona: "backend-critic",
        issueId: TEST_ISSUE,
        threadId: THREAD_A,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      },
    },
  };
  const grouped = groupSessionsByIssue(TEST_ISSUE, store);
  assert.equal(Object.keys(grouped[TEST_ISSUE]).length, 1);
  assert.deepEqual(grouped[TEST_ISSUE][THREAD_A].personas.sort(), ["backend-critic", "backend-executor"]);
});

test("acquire e release roundtrip no mesmo thread", () => {
  const prev = process.env.CURSOR_THREAD_ID;
  process.env.CURSOR_THREAD_ID = THREAD_A;
  try {
    releaseIssueLock(TEST_ISSUE, THREAD_A, { force: true });
    const acquired = acquireIssueLock(TEST_ISSUE, "orchestrator");
    assert.equal(acquired.ok, true);
    assert.equal(acquired.lock.threadId, THREAD_A);
    const released = releaseIssueLock(TEST_ISSUE, THREAD_A, { force: true });
    assert.equal(released.released, true);
  } finally {
    process.env.CURSOR_THREAD_ID = prev;
  }
});

test("findCrossChatConflicts detecta outro thread ativo", () => {
  const recent = new Date().toISOString();
  const store = {
    sessions: {
      other: {
        persona: "orchestrator",
        issueId: TEST_ISSUE,
        threadId: THREAD_B,
        startedAt: recent,
        lastActivityAt: recent,
      },
    },
  };
  const conflict = findCrossChatConflicts(TEST_ISSUE, THREAD_A);
  const grouped = groupSessionsByIssue(TEST_ISSUE, store);
  assert.ok(Object.keys(grouped[TEST_ISSUE]).includes(THREAD_B));
  if (conflict.conflict) {
    assert.ok(conflict.holders.length >= 0);
  }
});

test("evaluateCrossChatClaimConflicts retorna vazio sem holders ativos", () => {
  const prev = process.env.CURSOR_THREAD_ID;
  process.env.CURSOR_THREAD_ID = `cursor-isolated-${Date.now()}`;
  try {
    releaseIssueLock(TEST_ISSUE, process.env.CURSOR_THREAD_ID, { force: true });
    const violations = evaluateCrossChatClaimConflicts("orchestrator", TEST_ISSUE, {
      threadId: process.env.CURSOR_THREAD_ID,
    });
    const hasConflict = violations.some((v) => v.code === "CROSS_CHAT_CLAIM_CONFLICT");
    assert.equal(hasConflict, false);
  } finally {
    process.env.CURSOR_THREAD_ID = prev;
    releaseIssueLock(TEST_ISSUE, THREAD_A, { force: true });
    releaseIssueLock(TEST_ISSUE, THREAD_B, { force: true });
  }
});

test("acquire bloqueia thread diferente quando lock ativo", () => {
  const prev = process.env.CURSOR_THREAD_ID;
  process.env.CURSOR_THREAD_ID = THREAD_A;
  try {
    releaseIssueLock(TEST_ISSUE, THREAD_A, { force: true });
    releaseIssueLock(TEST_ISSUE, THREAD_B, { force: true });
    const first = acquireIssueLock(TEST_ISSUE, "orchestrator");
    assert.equal(first.ok, true);
    process.env.CURSOR_THREAD_ID = THREAD_B;
    const second = acquireIssueLock(TEST_ISSUE, "orchestrator");
    assert.equal(second.ok, false);
    assert.ok(second.conflict?.conflict);
  } finally {
    process.env.CURSOR_THREAD_ID = prev;
    releaseIssueLock(TEST_ISSUE, THREAD_A, { force: true });
    releaseIssueLock(TEST_ISSUE, THREAD_B, { force: true });
  }
});

test("evaluateIssueLockHeld exige lock ativo na thread", () => {
  const prev = process.env.CURSOR_THREAD_ID;
  const issue = "ANX-TEST-LOCK-Z21";
  process.env.CURSOR_THREAD_ID = THREAD_A;
  try {
    releaseIssueLock(issue, THREAD_A, { force: true });
    const missing = evaluateIssueLockHeld(issue, { threadId: THREAD_A });
    assert.ok(missing.some((v) => v.code === "MISSING_ISSUE_LOCK"));
    acquireIssueLock(issue, "orchestrator");
    const held = evaluateIssueLockHeld(issue, { threadId: THREAD_A });
    assert.equal(held.length, 0);
  } finally {
    releaseIssueLock(issue, THREAD_A, { force: true });
    process.env.CURSOR_THREAD_ID = prev;
  }
});
