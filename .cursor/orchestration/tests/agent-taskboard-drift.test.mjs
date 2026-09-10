import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  TASKBOARD_AGENT_SYNC_DRIFT,
  compareAgentSyncSets,
  detectAgentSyncDrift,
  formatAgentSyncDriftWarning,
} from "../agent-config/agent-taskboard-drift.mjs";

describe("agent-taskboard-drift", () => {
  test("compareAgentSyncSets detects missing board agents", () => {
    const result = compareAgentSyncSets({
      personaSlugs: ["orchestrator", "backend-executor"],
      registrySlugs: ["orchestrator", "backend-executor"],
      boardSlugs: ["orchestrator"],
    });
    assert.equal(result.drift, true);
    assert.equal(result.warning, TASKBOARD_AGENT_SYNC_DRIFT);
    assert.deepEqual(result.missingFromBoard, ["backend-executor"]);
  });

  test("formatAgentSyncDriftWarning includes sync command", () => {
    const message = formatAgentSyncDriftWarning({
      drift: true,
      missingFromBoard: ["backend-executor"],
      missingFromRegistry: [],
    });
    assert.match(message, /TASKBOARD_AGENT_SYNC_DRIFT/);
    assert.match(message, /sync-agents/);
  });

  test("detectAgentSyncDrift compares personas registry and board API", async () => {
    const result = await detectAgentSyncDrift({
      personaSlugs: ["orchestrator", "backend-executor"],
      registry: {
        agents: [{ slug: "orchestrator" }, { slug: "backend-executor" }],
      },
      fetchBoardAgentIds: async () => ({
        projectId: "proj-1",
        agentIds: ["orchestrator", "backend-executor"],
      }),
    });
    assert.equal(result.drift, false);
    assert.equal(result.boardOnline, true);
    assert.equal(result.projectId, "proj-1");
  });
});
