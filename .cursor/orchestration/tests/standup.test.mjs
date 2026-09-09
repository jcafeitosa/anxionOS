/**
 * Testes do CLI standup — formato e template.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildStandupTemplate,
  formatStandupBody,
} from "../agent-dialogue/standup.mjs";

test("formatStandupBody segue formato Feito/Fazendo/Bloqueio", () => {
  const body = formatStandupBody({
    done: "tests verdes",
    doing: "catálogo INTERACTIONS",
    blockers: "nenhum",
  });
  assert.match(body, /\*\*Feito:\*\* tests verdes/);
  assert.match(body, /\*\*Fazendo:\*\* catálogo INTERACTIONS/);
  assert.match(body, /\*\*Bloqueio:\*\* nenhum/);
});

test("buildStandupTemplate inclui orchestrator e personas", () => {
  const template = buildStandupTemplate("ANX-237", ["backend-executor", "backend-critic"]);
  assert.match(template, /Standup ANX-237/);
  assert.match(template, /Renata Oliveira/);
  assert.match(template, /Lucas Mendes/);
  assert.match(template, /Marina Ferreira/);
  assert.match(template, /\*\*Feito:\*\*/);
});
