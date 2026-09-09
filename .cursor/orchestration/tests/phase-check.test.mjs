/**
 * Testes do CLI phase-check — ciclo de vida P0→P7.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LIFECYCLE_PHASES,
  PHASE_ORDER,
  resolvePhaseCode,
  suggestNextSteps,
  mapPhaseToGates,
  createDefaultLifecycleState,
} from "../agent-lifecycle/phase-check.mjs";

test("LIFECYCLE_PHASES cobre P0–P7", () => {
  assert.equal(PHASE_ORDER.length, 8);
  for (const code of PHASE_ORDER) {
    assert.ok(LIFECYCLE_PHASES[code], `falta ${code}`);
    assert.ok(LIFECYCLE_PHASES[code].gate, `gate ausente em ${code}`);
  }
});

test("resolvePhaseCode aceita código e slug", () => {
  assert.equal(resolvePhaseCode("P4"), "P4");
  assert.equal(resolvePhaseCode("brainstorm"), "P0");
  assert.equal(resolvePhaseCode("development"), "P4");
  assert.equal(resolvePhaseCode("invalid"), null);
});

test("suggestNextSteps retorna passos acionáveis para brainstorm", () => {
  const result = suggestNextSteps("brainstorm");
  assert.equal(result.phase.code, "P0");
  assert.equal(result.nextPhase.code, "P1");
  assert.ok(result.steps.length >= 3);
  assert.ok(result.steps.some((s) => s.includes("orchestration:speak")));
});

test("mapPhaseToGates P4 mapeia G0–G7", () => {
  const result = mapPhaseToGates("P4", "ANX-134");
  assert.equal(result.lifecycleGate, "G0-G7");
  assert.deepEqual(result.pipelineGates, ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]);
  assert.ok(result.mapping.runbook.includes("E2E-RUNBOOK"));
});

test("mapPhaseToGates P1 exige brain docs", () => {
  const result = mapPhaseToGates("P1");
  assert.equal(result.mapping.preP4, true);
  assert.equal(result.mapping.requiresBrainDocs, true);
});

test("createDefaultLifecycleState inicia em P0", () => {
  const state = createDefaultLifecycleState("ANX-999");
  assert.equal(state.phase, "P0");
  assert.equal(state.gate, "G-B");
  assert.equal(state.issueId, "ANX-999");
});
