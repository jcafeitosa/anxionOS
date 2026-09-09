/**
 * Unit tests for cto-evidence gate parsing (false G4 BLOCKED fix).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { extractLatestGateVerdicts } from "../agent-proactive/cto-evidence.mjs";

test("extractLatestGateVerdicts ignora achados G4-SEC-02 (não é gate)", () => {
  const comments = [
    {
      title: "G4 SECURITY",
      body: `
**Gate:** G4 Security
**Disposição:** **PASS_WITH_CONDITIONS**
Achado G4-SEC-02 commit integrity RESOLVED @ dc12039.
`,
    },
  ];
  const verdicts = extractLatestGateVerdicts(comments);
  assert.equal(verdicts.G4, "PASS_WITH_CONDITIONS");
  assert.equal(verdicts.G2, undefined);
});

test("extractLatestGateVerdicts parseia tabela G2–G6", () => {
  const comments = [
    {
      title: "G2 Code Review",
      body: `
| Gate | Disposição |
| G2 | PASS |
| G3 | PASS_WITH_CONDITIONS |
`,
    },
  ];
  const verdicts = extractLatestGateVerdicts(comments);
  assert.equal(verdicts.G2, "PASS");
  assert.equal(verdicts.G3, "PASS_WITH_CONDITIONS");
});

test("extractLatestGateVerdicts usa comentário mais recente", () => {
  const comments = [
    { title: "old", body: "| G2 | BLOCKED |" },
    { title: "new", body: "**Gate:** G2\n**Disposição:** **PASS**" },
  ];
  const verdicts = extractLatestGateVerdicts(comments);
  assert.equal(verdicts.G2, "PASS");
});

test("extractLatestGateVerdicts não confunde G4-SEC com gate G4 BLOCKED", () => {
  const comments = [
    {
      title: "security note",
      body: "G4-SEC-05 BLOCKED era falso positivo; gate real abaixo.\n**Gate:** G4\n**Disposição:** **PASS**",
    },
  ];
  const verdicts = extractLatestGateVerdicts(comments);
  assert.equal(verdicts.G4, "PASS");
});
