#!/usr/bin/env node
/**
 * ANX-279 — CLI self-healing runbook executor.
 *
 * User instruction (goal): "Self-healing runbook executor staging" — consumers orchestration CLI
 * + dialogue; sem API HTTP nova (ANX-279).
 *
 * Importers/callers: package.json `orchestration:self-healing`, orchestration.bin subcommand
 * API: list | approve-g4 | run (see --help)
 * Schema: delegates to self-healing-executor execution log v1.0
 *
 * Usage:
 *   npm run orchestration:self-healing -- list [--json]
 *   npm run orchestration:self-healing -- approve-g4 --runbook ID --issue ANX-N --persona security-lead [--json]
 *   npm run orchestration:self-healing -- run --runbook ID --issue ANX-N --environment staging [--simulate] [--json]
 */
import { parseArgs } from "node:util";
import {
  SELF_HEALING_RUNBOOKS,
  listRunbookIds,
} from "./self-healing-runbooks.registry.mjs";
import {
  executeSelfHealingRunbook,
  recordG4Approval,
} from "./self-healing-executor.mjs";

function parseCommon(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      json: { type: "boolean", default: false },
      runbook: { type: "string" },
      issue: { type: "string" },
      persona: { type: "string" },
      environment: { type: "string", default: "staging" },
      simulate: { type: "boolean", default: false },
      evidence: { type: "string" },
      "decision-record-id": { type: "string" },
    },
    allowPositionals: true,
  });
  const command = positionals[0] ?? "help";
  return { command, values };
}

async function main() {
  const { command, values } = parseCommon(process.argv.slice(2));

  if (command === "list") {
    const rows = listRunbookIds().map((id) => SELF_HEALING_RUNBOOKS[id]);
    if (values.json) {
      console.log(JSON.stringify({ runbooks: rows }, null, 2));
    } else {
      console.log("Self-healing runbooks P1 (sandbox/staging)\n");
      for (const row of rows) {
        console.log(`- ${row.id}: ${row.name} (G4=${row.requiresG4}, DR=${row.requiresDecisionRecord})`);
      }
    }
    return;
  }

  if (command === "approve-g4") {
    if (!values.runbook || !values.issue || !values.persona) {
      throw new Error("approve-g4 requires --runbook --issue --persona");
    }
    const entry = recordG4Approval({
      runbookId: values.runbook,
      issue: values.issue,
      persona: values.persona,
      evidence: values.evidence,
    });
    const out = { action: "approve-g4", entry };
    if (values.json) console.log(JSON.stringify(out, null, 2));
    else console.log(`G4 PASS recorded for ${values.runbook} by ${values.persona}`);
    return;
  }

  if (command === "run") {
    if (!values.runbook || !values.issue) {
      throw new Error("run requires --runbook --issue --environment");
    }
    const result = await executeSelfHealingRunbook({
      runbookId: values.runbook,
      issue: values.issue,
      environment: values.environment,
      simulate: values.simulate,
      decisionRecordId: values["decision-record-id"],
    });
    if (values.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Runbook ${result.runbookId} → ${result.status}`);
      console.log(`Evidence: ${result.evidencePath}`);
    }
    return;
  }

  console.log(`Usage:
  npm run orchestration:self-healing -- list [--json]
  npm run orchestration:self-healing -- approve-g4 --runbook ID --issue ANX-N --persona security-lead
  npm run orchestration:self-healing -- run --runbook ID --issue ANX-N --environment staging [--simulate] [--json]`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
