/**
 * Testes agent-taskboard-write — comentário e move assinados (mock HTTP).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { taskboardComment, taskboardMove } from "../agent-config/agent-taskboard-write.mjs";

test("taskboardComment falha sem persona", async () => {
  const result = await taskboardComment({ issueId: "ANX-1", persona: null, body: "x" });
  assert.equal(result.ok, false);
  assert.equal(result.warning, "TASKBOARD_UNSIGNED_ACTION");
});

test("taskboardComment assina com headers de persona", async () => {
  const calls = [];
  const result = await taskboardComment(
    {
      issueId: "ANX-250",
      persona: "backend-executor",
      body: "prova de identidade",
      threadId: "thread-test",
    },
    {
      fetchHealth: async () => true,
      taskctl: null,
      httpJson: async (path, opts = {}) => {
        calls.push({ path, opts });
        if (path === "/api/tasks") {
          return { tasks: [{ id: "task-uuid", identifier: "ANX-250", version: 1 }] };
        }
        if (path === "/api/tasks/task-uuid/comments") {
          return {
            comment: {
              authorType: "user",
              authorId: "backend-executor",
              authorName: "Lucas Mendes · backend-executor",
              body: opts.body?.body,
            },
          };
        }
        throw new Error(`unexpected ${path}`);
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.author.authorId, "backend-executor");
  const post = calls.find((c) => c.path.endsWith("/comments"));
  assert.ok(post);
  assert.equal(post.opts.identity.creatorId, "backend-executor");
  assert.match(post.opts.body.body, /\[Lucas Mendes · backend-executor\]/);
});

test("taskboardMove exige thread id", async () => {
  const result = await taskboardMove(
    { issueId: "ANX-252", status: "in_review", persona: "orchestrator" },
    { fetchHealth: async () => true, resolveThreadId: () => null },
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /thread id/i);
});
