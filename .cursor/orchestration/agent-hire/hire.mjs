#!/usr/bin/env node
/**
 * Hire on-demand — Level B/C contratam dentro do domínio; CTO (A) override.
 *
 * Usage:
 *   npm run orchestration:hire -- --by-persona backend-executor --persona build-error-resolver --issue ANX-222 --reason "type errors" --evidence "tsc 12 erros"
 */

import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPersona } from "../agent-dialogue/personas.mjs";
import { canHire } from "./levels.mjs";
import { registerHire, findActiveByTarget } from "./roster.mjs";
import { assertIssueId } from "./registry.mjs";
import { fetchIssue } from "../agent-compliance/compliance-lib.mjs";
import { validateIssueForWrite } from "../agent-compliance/taskboard-gate.mjs";
import { maybeAutoSyncAgents } from "../agent-config/agent-taskboard-drift.mjs";
import { syncHireToTaskboard, HIRE_TASKBOARD_SYNC_WARNING } from "./hire-taskboard-sync.mjs";
import { enqueueFromHire } from "../agent-delegation/dispatch-queue.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function parseArgs(argv) {
  if (argv[0] === "delegate") return { delegate: true, issue: null, json: argv.includes("--json") };
  if (argv[0] === "bootstrap") return { bootstrap: true, json: argv.includes("--json") };
  const opts = {
    byPersona: null,
    persona: null,
    issue: null,
    reason: null,
    evidence: null,
    json: false,
    speak: false,
    skipTaskboardSync: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--by-persona") opts.byPersona = argv[++i];
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--issue") opts.issue = argv[++i]?.toUpperCase();
    else if (a === "--reason") opts.reason = argv[++i];
    else if (a === "--evidence") opts.evidence = argv[++i];
    else if (a === "--json") opts.json = true;
    else if (a === "--speak") opts.speak = true;
    else if (a === "--skip-taskboard-sync") opts.skipTaskboardSync = true;
    else if (a === "--help" || a === "-h") return { ...opts, help: true };
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

function usage() {
  console.log(`Usage:
  npm run orchestration:hire -- --by-persona SLUG --persona TARGET --issue ANX-N --reason TEXT --evidence TEXT [--speak] [--skip-taskboard-sync] [--json]`);
}

function postSpeak(hirer, target, issueId, reason, entry) {
  const body = `@time — Contrato **${target}** para ${issueId}: ${reason}. Evidência registrada no hire-log.`;
  execFileSync(
    "npm",
    [
      "run",
      "orchestration:broadcast",
      "--",
      "--from-persona",
      hirer,
      "--body",
      body,
      "--issue",
      issueId,
      "--type",
      "hire",
      "--hire-id",
      entry.id,
      "--hire-target",
      target,
      "--hire-reason",
      reason,
      "--hire-level",
      entry.hiredByLevel,
      "--evidence",
      `command:orchestration:hire --issue ${issueId}`,
    ],
    { cwd: root, stdio: "inherit" },
  );
}

async function runBootstrap(opts) {
  const r = spawnSync("node", [".cursor/orchestration/agent-hire/bootstrap.mjs", ...(opts.json ? ["--json"] : [])], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  console.log(r.stdout.trim());
  const sync = await maybeAutoSyncAgents("hire:bootstrap");
  if (!opts.json && sync.ok && !sync.skipped && sync.agentCount) {
    console.log(`✓ ${sync.agentCount} personas sincronizadas no taskboard (hire bootstrap)`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.bootstrap) { await runBootstrap(opts); return; }
  if (opts.delegate) {
    for (let i = 2; i < process.argv.length; i++) if (process.argv[i] === '--issue') opts.issue = process.argv[++i]?.toUpperCase();
    if (!opts.issue) throw new Error('delegate requer --issue ANX-N');
    const r = spawnSync('node', ['.cursor/orchestration/agent-hire/taskboard-sync.mjs', 'delegate', '--issue', opts.issue], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
    console.log(r.stdout.trim());
    return;
  }
  if (opts.help) {
    usage();
    return;
  }
  if (!opts.byPersona) opts.byPersona = "orchestrator";
  if (!opts.persona) throw new Error("--persona obrigatório");
  assertIssueId(opts.issue);
  const issueOk = await validateIssueForWrite(opts.issue, fetchIssue, { label: "orchestration:hire" });
  if (!issueOk) process.exit(1);
  if (!opts.reason?.trim()) throw new Error("--reason obrigatório");
  if (!opts.evidence?.trim() && opts.byPersona !== "orchestrator") throw new Error("--evidence obrigatório (por que agora)");
  if (!opts.evidence?.trim()) opts.evidence = opts.reason;

  getPersona(opts.byPersona);
  const auth = canHire(opts.byPersona, opts.persona, opts.issue);
  if (!auth.allowed) {
    console.error(`✗ Hire negado: ${auth.error}`);
    process.exit(1);
  }

  const entry = registerHire({
    issueId: opts.issue,
    target: opts.persona,
    targetType: auth.targetType,
    hiredBy: opts.byPersona,
    hiredByLevel: auth.level,
    reason: opts.reason,
    evidence: opts.evidence,
  });

  let taskboardSync = { ok: true, skipped: true };
  if (!opts.skipTaskboardSync) {
    taskboardSync = await syncHireToTaskboard(entry);
    if (!taskboardSync.ok && !opts.json) {
      console.warn(`⚠ ${HIRE_TASKBOARD_SYNC_WARNING}: hire registrado localmente; board não atualizado`);
    }
  }

  const dispatch = enqueueFromHire(entry);

  const result = { ok: true, hire: entry, taskboardSync, dispatch };
  if (opts.json) console.log(JSON.stringify(result, null, 2));
  else {
    const hirer = getPersona(opts.byPersona);
    console.log(`✓ Hire OK: ${opts.persona} · ${hirer.shortName} (Level ${auth.level}) · ${opts.issue}`);
    console.log(`  id: ${entry.id}`);
    console.log(`  dispatch: ${dispatch.id} → spawn Task: npm run orchestration:dispatch -- next`);
  }

  if (opts.speak) postSpeak(opts.byPersona, opts.persona, opts.issue, opts.reason, entry);

  if (!opts.skipTaskboardSync) {
    await maybeAutoSyncAgents("hire:after-hire");
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
