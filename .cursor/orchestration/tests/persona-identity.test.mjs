/**
 * Testes persona identity — personalidade sempre ativa (ANX-275)
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getPersonality,
  formatPersonaBlockHeader,
  hasPersonaBlock,
  blockContainsPersonaSlug,
  evaluatePersonaIdentityWarnings,
  evaluateActivePersonaWarnings,
  listPersonalities,
} from "../agent-dialogue/persona-identity.mjs";

test("listPersonalities cobre 18 personas", () => {
  assert.equal(listPersonalities().length, 18);
});

test("getPersonality retorna traits para backend-executor", () => {
  const p = getPersonality("backend-executor");
  assert.equal(p.fullName, "Lucas Mendes");
  assert.ok(p.coreTraits.includes("pragmático"));
  assert.ok(p.sampleVoice.length > 10);
});

test("formatPersonaBlockHeader inclui slug", () => {
  const h = formatPersonaBlockHeader("backend-critic");
  assert.match(h, /Marina Ferreira/);
  assert.match(h, /\[backend-critic\]/);
});

test("hasPersonaBlock detecta bloco válido", () => {
  const text = `---
**Lucas Mendes** · backend executor · [backend-executor] · execution
@marina — teste.
---`;
  assert.equal(hasPersonaBlock(text), true);
  assert.equal(hasPersonaBlock("só texto genérico"), false);
});

test("evaluatePersonaIdentityWarnings detecta assistant voice", () => {
  const warnings = evaluatePersonaIdentityWarnings("Conforme solicitado, implementação concluída.");
  assert.ok(warnings.some((w) => w.code === "PERSONA_BLOCK_MISSING"));
  assert.ok(warnings.some((w) => w.code === "PERSONA_ASSISTANT_VOICE"));
});

test("evaluateActivePersonaWarnings sem personalityAckAt", () => {
  const warnings = evaluateActivePersonaWarnings({ persona: "backend-executor", issueId: "ANX-1" });
  assert.ok(warnings.some((w) => w.code === "PERSONALITY_NOT_ACKNOWLEDGED"));
});

test("blockContainsPersonaSlug valida slug no bloco", () => {
  const text = "[backend-executor]";
  assert.equal(blockContainsPersonaSlug(text, "backend-executor"), true);
  assert.equal(blockContainsPersonaSlug(text, "orchestrator"), false);
});
