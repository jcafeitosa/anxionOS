/**
 * Testes rituais Google-style — ANX-274
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GOOGLE_RITUALS,
  isStandupFormat,
  detectPeerInteraction,
  evaluateTeamInteractionWarnings,
  listRituals,
} from "../agent-dialogue/google-team-rituals.mjs";

test("GOOGLE_RITUALS cobre standup, design review, code review", () => {
  assert.ok(GOOGLE_RITUALS.standup);
  assert.ok(GOOGLE_RITUALS.designReview);
  assert.ok(GOOGLE_RITUALS.codeReview);
  assert.equal(listRituals().length, Object.keys(GOOGLE_RITUALS).length);
});

test("isStandupFormat reconhece Feito/Fazendo/Bloqueio", () => {
  assert.equal(isStandupFormat("Feito: x. Fazendo: y. Bloqueio: nenhum"), true);
  assert.equal(isStandupFormat("status genérico"), false);
});

test("detectPeerInteraction identifica exchange executor-critic", () => {
  const messages = [
    {
      type: "ack",
      from: { role: "backend-executor" },
      body: "ok",
    },
    {
      type: "challenge",
      from: { role: "backend-critic" },
      body: "@lucas — epoch?",
    },
    {
      type: "response",
      from: { role: "backend-executor" },
      body: "@marina — corrigido",
    },
  ];
  const result = detectPeerInteraction("ANX-1", { messages });
  assert.equal(result.executorCriticExchange, true);
  assert.equal(result.peerToPeer, true);
});

test("evaluateTeamInteractionWarnings alerta sem peer chat", () => {
  const messages = [
    { type: "status", from: { role: "orchestrator" }, body: "status" },
    { type: "share", from: { role: "orchestrator" }, body: "share" },
    { type: "handoff", from: { role: "orchestrator" }, body: "handoff" },
  ];
  const warnings = evaluateTeamInteractionWarnings("ANX-1", { messages });
  assert.ok(warnings.some((w) => w.code === "GOOGLE_TEAM_NO_PEER_CHAT"));
});
