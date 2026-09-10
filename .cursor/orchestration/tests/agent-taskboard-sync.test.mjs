import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { syncAgentsToTaskboard } from "../agent-config/agent-taskboard-sync-agents.mjs";

describe("agent-taskboard-sync-agents", () => {
  test("syncAgentsToTaskboard posts personas to project agents API", async () => {
    const posts = [];
    const result = await syncAgentsToTaskboard({
      projectId: "local",
      slugs: ["backend-executor"],
      fetchHealth: async () => true,
      httpJson: async (_path, opts = {}) => {
        if (opts.method === "POST") posts.push(opts.body);
        return { agent: { id: opts.body.id, name: opts.body.name } };
      },
    });
    assert.equal(result.ok, true);
    assert.equal(posts[0].id, "backend-executor");
  });
});
