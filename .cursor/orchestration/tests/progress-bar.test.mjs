/**
 * Testes da barra de progresso G0–G7 e slices.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeGateStatuses,
  computeOverallProgress,
  computeSliceProgress,
  renderGateLine,
  renderProgressBar,
  renderProgressMarkdown,
} from "../agent-workflow/progress-bar.mjs";

test("renderProgressBar preenche proporção correta", () => {
  assert.equal(renderProgressBar(4, 8, 12), "██████░░░░░░");
  assert.equal(renderProgressBar(0, 5, 10), "░░░░░░░░░░");
  assert.equal(renderProgressBar(5, 5, 10), "██████████");
});

test("renderGateLine mostra ícones por gate", () => {
  const line = renderGateLine({
    G0: { status: "pass" },
    G1: { status: "pass" },
    G2: { status: "in_progress" },
    G3: { status: "pending" },
    G4: { status: "pending" },
    G5: { status: "pending" },
    G6: { status: "pending" },
    G7: { status: "pending" },
  });
  assert.match(line, /G0 ✅/);
  assert.match(line, /G2 ⏳/);
});

test("computeGateStatuses infere G0/G1 de issue in_review", () => {
  const gates = computeGateStatuses({
    issueId: "ANX-TEST",
    issueStatus: "in_review",
    dialogueMessages: [{ type: "ack", body: "ack", gate: null }],
    workflowStates: [],
    taskboardComments: [],
  });
  assert.equal(gates.G0.status, "pass");
  assert.equal(gates.G1.status, "pass");
});

test("computeGateStatuses lê verdict G2–G6 de comentários", () => {
  const gates = computeGateStatuses({
    issueId: "ANX-TEST",
    issueStatus: "in_review",
    dialogueMessages: [],
    workflowStates: [],
    taskboardComments: [
      {
        title: "G2",
        body: "**Gate:** G2\n**Disposição:** **PASS**\n| G3 | PASS_WITH_CONDITIONS |",
      },
    ],
  });
  assert.equal(gates.G2.status, "pass");
  assert.equal(gates.G3.status, "pass");
  assert.equal(gates.G3.verdict, "PASS_WITH_CONDITIONS");
});

test("computeOverallProgress calcula percentual", () => {
  const gates = {
    G0: { status: "pass" },
    G1: { status: "pass" },
    G2: { status: "pass" },
    G3: { status: "pass" },
    G4: { status: "pass" },
    G5: { status: "pass" },
    G6: { status: "pass" },
    G7: { status: "in_progress" },
  };
  const overall = computeOverallProgress(gates);
  assert.equal(overall.completed, 7);
  assert.equal(overall.percent, 88);
  assert.equal(overall.currentGate, "G7");
});

test("computeSliceProgress detecta slices em texto", () => {
  const slices = computeSliceProgress({
    delegationText: "Slice 1 PASS — A1; Slices 2–5 pendentes",
    dialogueMessages: [{ type: "status", body: "Slice 3 PASS entregue" }],
  });
  assert.equal(slices.total, 5);
  assert.equal(slices.completed, 2);
});

test("renderProgressMarkdown inclui linha de slices", () => {
  const md = renderProgressMarkdown({
    issueId: "ANX-134",
    issueStatus: "in_review",
    gates: {
      G0: { status: "pass" },
      G1: { status: "pass" },
      G2: { status: "pass" },
      G3: { status: "pass" },
      G4: { status: "pass" },
      G5: { status: "pass" },
      G6: { status: "in_progress" },
      G7: { status: "pending" },
    },
    overall: { completed: 6, total: 8, currentGate: "G6", percent: 75 },
    slices: { total: 5, completed: 5, label: null },
  });
  assert.match(md, /^ANX-134 /);
  assert.match(md, /in_review/);
  assert.match(md, /Slices:.*5\/5/);
});
