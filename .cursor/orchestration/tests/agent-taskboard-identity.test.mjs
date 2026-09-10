import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildActorHeaders, resolveAgentTaskboardIdentity } from "../agent-config/agent-taskboard-identity.mjs";

describe("agent-taskboard-identity", () => {
  test("resolveAgentTaskboardIdentity returns slug and display name", () => {
    const identity = resolveAgentTaskboardIdentity("backend-executor");
    assert.equal(identity.creatorType, "agent");
    assert.equal(identity.creatorId, "backend-executor");
    assert.match(identity.creatorName, /Lucas Mendes/);
    assert.match(identity.creatorName, /backend-executor/);
  });

  test("buildActorHeaders sends cursor client and persona headers", () => {
    const prevThread = process.env.CURSOR_THREAD_ID;
    process.env.CURSOR_THREAD_ID = "cursor-test-thread";
    const headers = buildActorHeaders(resolveAgentTaskboardIdentity("backend-executor"));
    assert.equal(headers["x-taskboard-client"], "cursor");
    assert.equal(headers["x-cursor-thread-id"], "cursor-test-thread");
    assert.equal(headers["x-taskboard-agent-id"], "backend-executor");
    process.env.CURSOR_THREAD_ID = prevThread;
    assert.equal(headers["x-taskboard-user-id"], "backend-executor");
    assert.equal(headers["x-taskboard-user-name"], headers["x-taskboard-agent-name"]);
  });
});
