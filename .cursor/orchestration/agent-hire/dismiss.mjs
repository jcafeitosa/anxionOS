#!/usr/bin/env node
/**
 * Dismiss on-demand — encerra contrato com evidência de entrega.
 *
 * Usage:
 *   npm run orchestration:dismiss -- --by-persona backend-executor --hire-id UUID --evidence "build green"
 *   npm run orchestration:dismiss -- --by-persona backend-executor --persona build-error-resolver --issue ANX-222 --evidence "..."
 */

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPersona } from "../agent-dialogue/personas.mjs";
import { canDismiss } from "./levels.mjs";
import { dismissHire, findActiveByTarget, listActive } from "./roster.mjs";
import { assertIssueId } from "./registry.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function parseArgs(argv) {
  if (argv[0] === "issue-done") return { cmd: "issue-done", issue: null, evidence: null, json: argv.includes("--json") };
  const opts = { byPersona: null, hireId: null, persona: null, issue: null, evidence: null, reject: false, json: false, speak: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--by-persona") opts.byPersona = argv[++i];
    else if (a === "--hire-id") opts.hireId = argv[++i];
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--issue") opts.issue = argv[++i]?.toUpperCase();
    else if (a === "--evidence") opts.evidence = argv[++i];
    else if (a === "--reject") opts.reject = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--speak") opts.speak = true;
    else if (a === "--help" || a === "-h") return { ...opts, help: true };
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

function resolveHireId(opts) {
  if (opts.hireId) return opts.hireId;
  if (opts.persona && opts.issue) {
    const hit = findActiveByTarget(opts.issue, opts.persona);
    if (!hit) throw new Error(`Nenhum hire ativo de ${opts.persona} em ${opts.issue}`);
    return hit.id;
  }
  throw new Error("Informe --hire-id ou (--persona + --issue)");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.cmd === "issue-done") {
    for (let i = 2; i < process.argv.length; i += 1) {
      if (process.argv[i] === "--issue") opts.issue = process.argv[++i]?.toUpperCase();
      else if (process.argv[i] === "--evidence") opts.evidence = process.argv[++i];
    }
    if (!opts.issue) throw new Error("issue-done requer --issue ANX-N");
    assertIssueId(opts.issue);
    const active = listActive(opts.issue);
    const dismissed = [];
    for (const a of active) {
      dismissed.push(dismissHire(a.id, { dismissedBy: "orchestrator", evidence: opts.evidence ?? "issue done", rejected: false }));
    }
    const result = { issueId: opts.issue, dismissedCount: dismissed.length };
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else console.log(`Dispensados ${result.dismissedCount} on-demand de ${opts.issue}`);
    return;
  }
  if (opts.help) {
    console.log(`Usage:
  npm run orchestration:dismiss -- --by-persona SLUG --hire-id UUID --evidence TEXT
  npm run orchestration:dismiss -- --by-persona SLUG --persona TARGET --issue ANX-N --evidence TEXT [--reject] [--speak]`);
    return;
  }
  if (!opts.byPersona) opts.byPersona = "orchestrator";
  if (!opts.evidence?.trim()) throw new Error("--evidence obrigatório (o que foi entregue)");
  if (opts.issue) assertIssueId(opts.issue);

  getPersona(opts.byPersona);
  const hireId = resolveHireId(opts);
  const active = listActive().find((a) => a.id === hireId);
  if (!active) throw new Error(`Hire não encontrado: ${hireId}`);

  const auth = canDismiss(opts.byPersona, { hiredBy: active.hiredBy, target: active.slug, issueId: active.issueId });
  if (!auth.allowed && !(opts.reject && opts.byPersona === "orchestrator")) {
    console.error(`✗ Dismiss negado: ${auth.reason}`);
    process.exit(1);
  }

  const hire = dismissHire(hireId, {
    dismissedBy: opts.byPersona,
    evidence: opts.evidence,
    rejected: opts.reject && opts.byPersona === "orchestrator",
  });

  const result = { ok: true, hire };
  if (opts.json) console.log(JSON.stringify(result, null, 2));
  else console.log(`✓ Dismiss OK: ${hire.slug} · ${hire.issueId} · status=${hire.status}`);

  if (opts.speak) {
    const body = `@time — Dispensa **${hire.slug}** em ${hire.issueId}. Evidência: ${opts.evidence}`;
    execFileSync(
      "npm",
      [
        "run",
        "orchestration:broadcast",
        "--",
        "--from-persona",
        opts.byPersona,
        "--body",
        body,
        "--issue",
        hire.issueId,
        "--type",
        "dismiss",
        "--dismiss-id",
        hire.id,
        "--dismiss-target",
        hire.slug,
        ...(opts.reject ? ["--dismiss-rejected"] : []),
        "--evidence",
        `command:orchestration:dismiss --issue ${hire.issueId}`,
      ],
      { cwd: root, stdio: "inherit" },
    );
  }
}

main();
