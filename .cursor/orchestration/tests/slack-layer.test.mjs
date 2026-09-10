/**
 * Testes da camada Slack — channels, reactions, pins, search, threads, mentions.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { resetOrchestrationPathsCache } from "../agent-config/load-config.mjs";
import {
  addReaction,
  buildThreadTree,
  ensureChannel,
  formatReactionsLine,
  getUnreadCount,
  highlightMentions,
  joinChannel,
  listChannels,
  markChannelRead,
  pinMessage,
  removeReaction,
  resolveChannelId,
  searchDialogue,
  setPresence,
} from "../agent-dialogue/slack-store.mjs";
import { appendDialogueMessage } from "../agent-dialogue/dialogue-log.mjs";
import { createDialogueMessage } from "../agent-dialogue/protocol.mjs";


let tempRuntime;

before(() => {
  tempRuntime = mkdtempSync(join(tmpdir(), "anx-slack-"));
  process.env.ORCHESTRATION_TEST_RUNTIME = tempRuntime;
  resetOrchestrationPathsCache();
});

after(() => {
  delete process.env.ORCHESTRATION_TEST_RUNTIME;
  resetOrchestrationPathsCache();
  if (tempRuntime) rmSync(tempRuntime, { recursive: true, force: true });
});

const baseFrom = {
  agentId: "orchestrator-local",
  role: "orchestrator",
  name: "Renata Oliveira",
  persona: { name: "Renata Oliveira", role: "orchestrator", team: "orchestration" },
};

test("resolveChannelId mapeia issue e general", () => {
  assert.equal(resolveChannelId("ANX-240"), "ANX-240");
  assert.equal(resolveChannelId(""), "general");
  assert.equal(resolveChannelId({ issueId: "ANX-135" }), "ANX-135");
  assert.equal(resolveChannelId({ issueId: null }), "general");
});

test("highlightMentions destaca @persona", () => {
  const out = highlightMentions("Olá @marina — revisar slice");
  assert.match(out, /\*\*@marina\*\*/);
});

test("buildThreadTree agrupa replyTo", () => {
  const parentId = randomUUID();
  const parent = createDialogueMessage({
    id: parentId,
    from: baseFrom,
    type: "consult",
    body: "Pergunta pai",
    issueId: "ANX-VALIDATION",
  });
  const child = createDialogueMessage({
    from: baseFrom,
    type: "response",
    body: "Resposta filha",
    issueId: "ANX-VALIDATION",
    replyTo: parentId,
  });
  const tree = buildThreadTree([parent, child]);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].replies.length, 1);
});

test("formatReactionsLine resume contagem", () => {
  const line = formatReactionsLine({ "👍": ["a", "b"], "✅": ["c"] });
  assert.match(line, /👍 2/);
  assert.match(line, /✅ 1/);
});

test("channels join/list e unread", () => {
  const msg = appendDialogueMessage(
    createDialogueMessage({
      from: baseFrom,
      type: "status",
      body: "Slack layer smoke ANX-VALIDATION",
      issueId: "ANX-VALIDATION",
    }),
  );
  ensureChannel("ANX-VALIDATION");
  joinChannel("ANX-VALIDATION", "orchestrator");
  const channels = listChannels({ issueId: "ANX-VALIDATION" });
  assert.ok(channels.some((c) => c.id === "ANX-VALIDATION"));
  assert.ok(getUnreadCount("ANX-VALIDATION") >= 1);
  markChannelRead("ANX-VALIDATION", msg.id);
  assert.equal(getUnreadCount("ANX-VALIDATION"), 0);
});

test("reactions add/remove", () => {
  const msg = appendDialogueMessage(
    createDialogueMessage({
      from: baseFrom,
      type: "share",
      body: "reaction test",
      issueId: "ANX-VALIDATION",
    }),
  );
  addReaction(msg.id, "👍", "orchestrator");
  removeReaction(msg.id, "👍", "orchestrator");
});

test("pinMessage fixa mensagem", () => {
  const msg = appendDialogueMessage(
    createDialogueMessage({
      from: baseFrom,
      type: "plan",
      body: "pin test",
      issueId: "ANX-VALIDATION",
    }),
  );
  const pin = pinMessage("ANX-VALIDATION", msg.id, "orchestrator");
  assert.equal(pin.messageId, msg.id);
});

test("searchDialogue encontra texto", () => {
  appendDialogueMessage(
    createDialogueMessage({
      from: baseFrom,
      type: "status",
      body: "busca Slack layer keyword xyz",
      issueId: "ANX-VALIDATION",
    }),
  );
  const hits = searchDialogue("xyz", { issueId: "ANX-VALIDATION", limit: 5 });
  assert.ok(hits.length >= 1);
});

test("setPresence registra status", () => {
  const p = setPresence("orchestrator", "away", "ANX-VALIDATION");
  assert.equal(p.status, "away");
  setPresence("orchestrator", "active", "ANX-240");
});
