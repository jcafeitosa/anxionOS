/**
 * Testes do roster de personas — contagem e pares executor/crítico.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { PERSONAS, PERSONA_SLUGS } from "../agent-dialogue/personas.mjs";
import { LEVEL_C } from "../agent-hire/levels.mjs";

test("roster tem 18 personas (núcleo + anéis A/B/C)", () => {
  assert.equal(PERSONA_SLUGS.length, 18);
  assert.equal(Object.keys(PERSONAS).length, 18);
});

test("orchestrator tem par crítico de governança (cto-critic)", () => {
  const orchestrator = PERSONAS.orchestrator;
  assert.ok(orchestrator?.criticSlug === "cto-critic");
  assert.equal(PERSONAS["cto-critic"]?.criticOf, "orchestrator");
});

test("cada executor Level C tem criticSlug válido", () => {
  const executors = LEVEL_C.filter((slug) => slug.endsWith("-executor"));
  assert.equal(executors.length, 4, "esperados 4 executores Level C");

  for (const slug of executors) {
    const persona = PERSONAS[slug];
    assert.ok(persona, `${slug} deve existir em PERSONAS`);
    assert.ok(persona.criticSlug, `${slug} deve ter criticSlug`);
    assert.ok(
      PERSONAS[persona.criticSlug],
      `${slug}.criticSlug (${persona.criticSlug}) deve apontar para persona existente`,
    );
    assert.equal(
      PERSONAS[persona.criticSlug].criticOf,
      slug,
      `crítico ${persona.criticSlug} deve criticar ${slug}`,
    );
  }
});

test("cada crítico Level C tem criticOf pareado", () => {
  const critics = LEVEL_C.filter((slug) => slug.endsWith("-critic"));
  assert.equal(critics.length, 4, "esperados 4 críticos Level C");

  for (const slug of critics) {
    const persona = PERSONAS[slug];
    assert.ok(persona.criticOf, `${slug} deve ter criticOf`);
    assert.ok(PERSONAS[persona.criticOf], `${slug}.criticOf deve existir`);
    assert.equal(
      PERSONAS[persona.criticOf].criticSlug,
      slug,
      `executor ${persona.criticOf} deve apontar de volta para ${slug}`,
    );
  }
});

test("orchestrator tem criticSlug cto-critic no nucleo", () => {
  const o = PERSONAS.orchestrator;
  assert.equal(o.criticSlug, "cto-critic");
  assert.equal(PERSONAS["cto-critic"].criticOf, "orchestrator");
});
