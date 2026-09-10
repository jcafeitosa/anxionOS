/**
 * Testes hire-taskboard-sync — comentário, label e idempotência (mock taskctl).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HIRE_TASKBOARD_SYNC_WARNING,
  buildHireSyncComment,
  commentHasHireSyncMarker,
  hireSyncLabel,
  hireSyncMarker,
  issueHasHireLabel,
  mergeHireLabels,
  syncHireToTaskboard,
} from "../agent-hire/hire-taskboard-sync.mjs";

const sampleEntry = {
  id: "11111111-2222-3333-4444-555555555555",
  slug: "build-error-resolver",
  issueId: "ANX-222",
  hiredBy: "backend-executor",
  hiredByLevel: "C",
  targetType: "worker",
  reason: "12 erros TypeScript",
  evidence: "bun run check-types exit 1",
  cursorSubagentType: "build-error-resolver",
};

test("hireSyncMarker e hireSyncLabel são estáveis", () => {
  assert.equal(hireSyncMarker(sampleEntry.id), `HIRE_TB_SYNC:${sampleEntry.id}`);
  assert.equal(hireSyncLabel("code-reviewer"), "hired:code-reviewer");
});

test("buildHireSyncComment inclui marker e metadados", () => {
  const body = buildHireSyncComment(sampleEntry, { shortName: "Lucas" });
  assert.match(body, /\[hire-sync\]/);
  assert.match(body, /build-error-resolver/);
  assert.match(body, /HIRE_TB_SYNC:11111111-2222-3333-4444-555555555555/);
  assert.match(body, /cursorSubagentType/);
});

test("mergeHireLabels preserva labels existentes", () => {
  const merged = mergeHireLabels(["for-claude", "phase-1"], "build-error-resolver");
  assert.deepEqual(merged, ["for-claude", "phase-1", "hired:build-error-resolver"]);
  const again = mergeHireLabels(merged, "build-error-resolver");
  assert.equal(again.length, 3);
});

test("commentHasHireSyncMarker detecta comentário existente", () => {
  const comments = [{ body: `foo _ref: \`${hireSyncMarker(sampleEntry.id)}\`_` }];
  assert.equal(commentHasHireSyncMarker(comments, sampleEntry.id), true);
  assert.equal(commentHasHireSyncMarker([], sampleEntry.id), false);
});

test("issueHasHireLabel detecta label hired:", () => {
  assert.equal(issueHasHireLabel({ labels: ["hired:build-error-resolver"] }, "build-error-resolver"), true);
  assert.equal(issueHasHireLabel({ labels: [] }, "build-error-resolver"), false);
});

test("syncHireToTaskboard falha graciosamente quando board offline", async () => {
  const warnings = [];
  const result = await syncHireToTaskboard(sampleEntry, {
    fetchHealth: async () => { throw new Error("offline"); },
    warn: (msg) => warnings.push(msg),
  });
  assert.equal(result.ok, false);
  assert.equal(result.warning, HIRE_TASKBOARD_SYNC_WARNING);
  assert.ok(warnings.some((w) => w.includes(HIRE_TASKBOARD_SYNC_WARNING)));
});

test("syncHireToTaskboard adiciona comentário e label (mock)", async () => {
  const httpCalls = [];
  const result = await syncHireToTaskboard(sampleEntry, {
    fetchHealth: async () => true,
    taskctl: "/fake/taskctl",
    threadId: "thread-test",
    runTaskctl: (_ctl, args) => {
      if (args[0] === "issue" && args[1] === "get") {
        return { task: { id: "t1", version: 2, labels: ["for-claude"] } };
      }
      if (args[0] === "comment" && args[1] === "list") {
        return { comments: [] };
      }
      return {};
    },
    httpJson: async (path, opts = {}) => {
      httpCalls.push({ path, opts });
      if (path === "/api/projects") {
        return { projects: [{ id: "local", name: "anxionOS", workspacePath: "/tmp" }] };
      }
      if (path.includes("/agents") && opts.method === "POST") {
        return { agent: { id: opts.body.id, name: opts.body.name } };
      }
      if (path.endsWith("/comments")) {
        return { comment: { id: "c1", body: opts.body.body } };
      }
      if (opts.body?.labels) {
        return { task: { version: 3, labels: opts.body.labels } };
      }
      return { task: { version: 3 } };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.commentAdded, true);
  assert.equal(result.labelUpdated, true);
  const commentCall = httpCalls.find((c) => c.path.endsWith("/comments"));
  assert.ok(commentCall);
  assert.match(commentCall.opts.body.body, /HIRE_TB_SYNC:/);
  assert.equal(commentCall.opts.identity.creatorId, "backend-executor");
  const labelCall = httpCalls.find((c) => c.opts.body?.labels);
  assert.ok(labelCall.opts.body.labels.includes("hired:build-error-resolver"));
});

test("syncHireToTaskboard é idempotente quando marker e label existem", async () => {
  let callCount = 0;
  const result = await syncHireToTaskboard(sampleEntry, {
    fetchHealth: async () => true,
    taskctl: "/fake/taskctl",
    runTaskctl: (_ctl, args) => {
      callCount += 1;
      if (args[0] === "issue" && args[1] === "get") {
        return { task: { version: 5, labels: ["hired:build-error-resolver"] } };
      }
      if (args[0] === "comment" && args[1] === "list") {
        return { comments: [{ body: `_ref: \`${hireSyncMarker(sampleEntry.id)}\`_` }] };
      }
      throw new Error("não deveria escrever");
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(callCount, 2);
});
