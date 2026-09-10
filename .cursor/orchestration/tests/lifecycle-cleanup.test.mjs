/**
 * Testes lifecycle-cleanup e pending-escalate.
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import {
  pendingEscalationToTrigger,
  readPendingEscalation,
  drainPendingEscalation,
} from "../agent-autonomy/pending-escalate.mjs";
import {
  delegationFromHire,
  evaluateParentDelegationWarnings,
  isDelegationStale,
  DEFAULT_STALE_MS,
} from "../agent-workflow/delegate-monitor.mjs";

test("delegationFromHire marca stale sem dialogue", () => {
  const old = new Date(Date.now() - 15 * 60_000).toISOString();
  const d = delegationFromHire({
    id: "hire-1",
    slug: "security-reviewer",
    issueId: "ANX-256",
    hiredBy: "orchestrator",
    hiredAt: old,
    status: "active",
  });
  assert.equal(d.stale, true);
  assert.ok(d.silentForMs >= DEFAULT_STALE_MS);
});

test("evaluateParentDelegationWarnings alerta orchestrator", () => {
  const warnings = evaluateParentDelegationWarnings([
    {
      stale: true,
      persona: "backend-executor",
      issueId: "ANX-135",
      kind: "session",
    },
  ]);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "PARENT_DELEGATION_STALE");
});

test("pendingEscalationToTrigger mapeia silent-end", () => {
  const trigger = pendingEscalationToTrigger({
    reason: "silent-end",
    persona: "backend-executor",
    issueId: "ANX-135",
    body: "teste",
    createdAt: new Date().toISOString(),
  });
  assert.equal(trigger.id, "pending-escalate-silent-end");
  assert.equal(trigger.severity, "escalate");
  assert.equal(trigger.actionKind, "act-dialogue");
});

test("drainPendingEscalation arquiva e remove arquivo", () => {
  const root = mkdtempSync(join(tmpdir(), "orch-escalate-"));
  const autonomy = join(root, ".cursor/orchestration-runtime/autonomy");
  mkdirSync(autonomy, { recursive: true });
  const path = join(autonomy, "pending-escalate.json");
  writeFileSync(
    path,
    `${JSON.stringify({ reason: "test", issueId: "ANX-1", createdAt: new Date().toISOString() })}\n`,
    "utf8",
  );

  process.env.ORCHESTRATION_RUNTIME_ROOT = join(root, ".cursor/orchestration-runtime");
  const entry = drainPendingEscalation({ acknowledgedBy: "test", projectRoot: root });
  assert.ok(entry);
  assert.equal(readPendingEscalation(root), null);
  delete process.env.ORCHESTRATION_RUNTIME_ROOT;
});
