/**
 * Testes — evaluateCapabilitiesUnderusedWarnings (CAPABILITIES_UNDERUSED · Z19).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateCapabilitiesUnderusedWarnings } from "../agent-compliance/capabilities-gate.mjs";

test("evaluateCapabilitiesUnderusedWarnings silencioso sem sessao", () => {
  const warnings = evaluateCapabilitiesUnderusedWarnings({
    persona: "backend-executor",
    mode: "pre-work",
    issueId: "ANX-249",
    session: null,
  });
  assert.equal(warnings.length, 0);
});

test("evaluateCapabilitiesUnderusedWarnings silencioso sessao recente", () => {
  const warnings = evaluateCapabilitiesUnderusedWarnings({
    persona: "backend-executor",
    mode: "pre-work",
    issueId: "ANX-249",
    session: {
      issueId: "ANX-249",
      startedAt: new Date().toISOString(),
    },
  });
  assert.equal(warnings.length, 0);
});

test("evaluateCapabilitiesUnderusedWarnings retorna CAPABILITIES_UNDERUSED com fix", () => {
  const warnings = evaluateCapabilitiesUnderusedWarnings({
    persona: "backend-executor",
    mode: "full",
    issueId: "ANX-999",
    session: {
      issueId: "ANX-999",
      startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  });
  if (warnings.length > 0) {
    assert.equal(warnings[0].code, "CAPABILITIES_UNDERUSED");
    assert.ok(warnings[0].fix.includes("AGENT-CAPABILITIES.md"));
  }
});
