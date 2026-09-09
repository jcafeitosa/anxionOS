/**
 * Testes do protocolo de diálogo — tipos e validação Zod.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  MESSAGE_TYPES,
  createDialogueMessage,
  parseDialogueMessage,
} from "../agent-dialogue/protocol.mjs";

const baseFrom = {
  agentId: "backend-executor-local",
  role: "executor",
  name: "Lucas Mendes",
};

function baseInput(overrides = {}) {
  return {
    from: baseFrom,
    type: "ack",
    body: "mensagem de teste",
    issueId: "ANX-222",
    ...overrides,
  };
}

test("MESSAGE_TYPES tem exatamente 24 tipos", () => {
  assert.equal(MESSAGE_TYPES.length, 24);
});

test("Zod valida mensagem ack", () => {
  const msg = createDialogueMessage(baseInput({ type: "ack" }));
  assert.equal(msg.type, "ack");
  assert.equal(parseDialogueMessage(msg).type, "ack");
});

test("Zod valida mensagem hire com hire record", () => {
  const hireId = randomUUID();
  const msg = createDialogueMessage(
    baseInput({
      type: "hire",
      body: "@marina — contrato build-error-resolver para ANX-222.",
      hire: {
        hireId,
        target: "build-error-resolver",
        reason: "resolver erro de build no slice P02",
        hiredByLevel: "C",
      },
    }),
  );
  assert.equal(msg.hire?.target, "build-error-resolver");
  assert.equal(parseDialogueMessage(msg).hire.hireId, hireId);
});

test("Zod valida mensagem decision com decision record", () => {
  const msg = createDialogueMessage(
    baseInput({
      type: "decision",
      body: "Decisão: seguir abordagem A.",
      decision: {
        subject: "estratégia de commit",
        options: ["wave incremental", "big bang"],
        chosen: "wave incremental",
        rationale: "menor blast radius",
        reversible: true,
      },
    }),
  );
  assert.equal(msg.decision?.chosen, "wave incremental");
  assert.equal(parseDialogueMessage(msg).decision.reversible, true);
});

test("Zod valida mensagem plan com plan record", () => {
  const msg = createDialogueMessage(
    baseInput({
      type: "plan",
      body: "Plano G1 para ANX-222.",
      plan: {
        phase: "G1",
        steps: ["auditar diff", "corrigir drift", "submeter in_review"],
      },
    }),
  );
  assert.equal(msg.plan?.phase, "G1");
  assert.equal(parseDialogueMessage(msg).plan.steps.length, 3);
});

test("Zod rejeita hire sem hireId UUID", () => {
  assert.throws(
    () =>
      createDialogueMessage(
        baseInput({
          type: "hire",
          body: "hire inválido",
          hire: {
            hireId: "not-a-uuid",
            target: "build-error-resolver",
            reason: "teste",
            hiredByLevel: "C",
          },
        }),
      ),
    /hireId/,
  );
});
