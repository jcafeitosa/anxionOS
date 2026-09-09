#!/usr/bin/env node
/**
 * CLI de compliance obrigatorio — gates executaveis (nao prose-only).
 */

import { fileURLToPath } from "node:url";
import { inferPersonaFromSessions, runComplianceCheck } from "./compliance-lib.mjs";
import { formatIssueIdHint, getProjectName } from "../agent-config/load-config.mjs";

function parseArgs(argv) {
  const opts = { persona: null, issueId: null, mode: "full", json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--pre-work") opts.mode = "pre-work";
    else if (a === "--pre-commit") opts.mode = "pre-commit";
    else if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else throw new Error(`Opcao desconhecida: ${a}`);
  }
  return opts;
}

function usage() {
  console.log(`${getProjectName()} orchestration compliance — enforcement layer

  npm run orchestration:compliance -- --persona SLUG --issue ${formatIssueIdHint()}
  npm run orchestration:compliance -- --pre-work --issue ${formatIssueIdHint()} [--persona SLUG]
  npm run orchestration:compliance -- --pre-commit --issue ${formatIssueIdHint()} [--persona SLUG]

Exit 0 = compliant · Exit 1 = violations (com fix commands)
Docs: .cursor/orchestration/MANDATORY-COMPLIANCE.md`);
}

function printWarnings(warnings) {
  if (!warnings?.length) return;
  console.warn(`⚠️  TOOLING WARNINGS (nao bloqueante)\n`);
  for (const w of warnings) {
    console.warn(`  [${w.code}] ${w.message}`);
    console.warn(`    fix: ${w.fix}\n`);
  }
}

export function printReport(result) {
  printWarnings(result.warnings);
  if (result.compliant) {
    console.log(`✅ COMPLIANT · ${result.persona} · ${result.issueId} · mode=${result.mode}`);
    if (result.workflow) {
      console.log(`   step=${result.workflow.step} · ack=${result.workflow.checklist?.ackPosted}`);
    }
    if (result.reminders?.length) {
      console.log("   Lembretes (soft):");
      for (const r of result.reminders) console.log(`   · ${r}`);
    }
    return;
  }
  console.error(`❌ COMPLIANCE VIOLATIONS · ${result.persona} · ${result.issueId} · mode=${result.mode}\n`);
  for (const v of result.violations) {
    console.error(`  [${v.code}] ${v.message}`);
    console.error(`    fix: ${v.fix}\n`);
  }
  if (result.reminders?.length) {
    console.error("  Lembretes (soft):");
    for (const r of result.reminders) console.error(`    · ${r}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { usage(); process.exit(0); }
  if (!opts.issueId) { console.error(`Erro: --issue ${formatIssueIdHint()} obrigatorio`); usage(); process.exit(1); }
  const persona = opts.persona ?? inferPersonaFromSessions(opts.issueId);
  const result = await runComplianceCheck({ persona, issueId: opts.issueId, mode: opts.mode });
  if (opts.json) console.log(JSON.stringify(result, null, 2));
  else printReport(result);
  process.exit(result.compliant ? 0 : 1);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => { console.error(`compliance-check error: ${err.message}`); process.exit(1); });
}

export { main };
