/**
 * Testes Product Company stage tracking — ANX-269.
 */
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { test } from "node:test";
import {
  PRODUCT_COMPANY_STAGES,
  STAGE_ORDER,
  inferProductCompanyStage,
  inferStageFromGates,
  resolveStageCode,
  stagesForLifecyclePhase,
} from "../agent-lifecycle/product-company-stages.mjs";
import {
  buildCompanyStageReport,
  lifecyclePath,
  loadLifecycleState,
  saveLifecycleState,
} from "../agent-lifecycle/phase-check.mjs";

test("PRODUCT_COMPANY_STAGES cobre 12 etapas", () => {
  assert.equal(STAGE_ORDER.length, 12);
  for (const code of STAGE_ORDER) {
    assert.ok(PRODUCT_COMPANY_STAGES[code], `falta ${code}`);
    assert.ok(PRODUCT_COMPANY_STAGES[code].number >= 1);
  }
});

test("resolveStageCode aceita PC7, 7 e slug", () => {
  assert.equal(resolveStageCode("PC7"), "PC7");
  assert.equal(resolveStageCode("7"), "PC7");
  assert.equal(resolveStageCode("development"), "PC7");
  assert.equal(resolveStageCode("invalid"), null);
});

test("inferStageFromGates mapeia G3 para PC8", () => {
  const stage = inferStageFromGates(
    { G0: { status: "pass" }, G1: { status: "pass" }, G3: { status: "pass" } },
    "in_progress",
  );
  assert.equal(stage, "PC8");
});

test("inferStageFromGates mapeia G2 para PC9", () => {
  const stage = inferStageFromGates({ G2: { status: "pass" } }, "in_review");
  assert.equal(stage, "PC9");
});

test("inferProductCompanyStage usa lifecycle P3 → PC6", () => {
  const result = inferProductCompanyStage({ lifecyclePhase: "P3" });
  assert.equal(result.stage, "PC6");
  assert.equal(result.source, "lifecycle");
});

test("inferProductCompanyStage respeita override persistido", () => {
  const result = inferProductCompanyStage({
    lifecyclePhase: "P4",
    explicitStage: "PC4",
  });
  assert.equal(result.stage, "PC4");
  assert.equal(result.source, "persisted");
});

test("stagesForLifecyclePhase P4 inclui PC7–PC10", () => {
  const stages = stagesForLifecyclePhase("P4");
  assert.ok(stages.includes("PC7"));
  assert.ok(stages.includes("PC10"));
});

test("buildCompanyStageReport persiste etapa por issue", () => {
  const issueId = "ANX-269";
  const path = lifecyclePath(issueId);
  const hadFile = existsSync(path);
  try {
    saveLifecycleState(issueId, { phase: "P4", productCompanyStage: "PC8" });
    const report = buildCompanyStageReport(issueId);
    assert.equal(report.productCompanyStage, "PC8");
    assert.equal(report.productCompanyStageName, "Testing / Verification");
    const state = loadLifecycleState(issueId);
    assert.equal(state.productCompanyStage, "PC8");
  } finally {
    if (hadFile) {
      // restore not required for CI — issue under active development
    } else if (existsSync(path)) {
      rmSync(path);
    }
  }
});
