#!/usr/bin/env node
/**
 * CLI proativo — check, suggest, act (ações seguras apenas).
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendDialogueMessage } from "../agent-dialogue/dialogue-log.mjs";
import { getPersona } from "../agent-dialogue/personas.mjs";
import { createDialogueMessage } from "../agent-dialogue/protocol.mjs";
import { appendProactiveLog } from "./proactive-log.mjs";
import { evaluateTriggers, formatTriggerResults } from "./triggers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function usage(exitCode = 0) {
  console.log(`anxionOS proactive initiative

Commands:
  check [--persona SLUG] [--json]   Avalia todos os triggers
  suggest [--persona SLUG] [--json] Próximas ações para a persona
  act [--persona SLUG] [--dry-run]  Executa auto-ações seguras

Docs: .cursor/orchestration/PROACTIVITY.md`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = { persona: null, json: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--json") opts.json = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

function runTaskboardEnsure() {
  const result = spawnSync("npm", ["run", "taskboard:ensure"], { cwd: root, encoding: "utf8" });
  return { ok: result.status === 0, stdout: result.stdout, stderr: result.stderr };
}

function postDialogue(personaSlug, payload, issueId) {
  const p = getPersona(personaSlug);
  const message = createDialogueMessage({
    from: {
      agentId: `${p.slug}-proactive`,
      role: p.role === "orchestrator" ? "orchestrator" : p.role,
      name: p.fullName,
      persona: { name: p.fullName, role: p.slug, team: p.team },
    },
    issueId,
    gate: payload.gate ?? undefined,
    type: payload.type ?? "status",
    body: payload.body,
    verdict: payload.verdict ?? undefined,
  });
  return appendDialogueMessage(message);
}

async function cmdCheck(opts) {
  const results = await evaluateTriggers(opts.persona);
  for (const r of results) {
    appendProactiveLog({
      triggerId: r.id,
      action: "check",
      persona: opts.persona,
      issueId: r.issueId,
      severity: r.severity,
      summary: r.summary,
      meta: r.meta,
    });
  }
  console.log(formatTriggerResults(results, opts.json ? "json" : "text"));
}

async function cmdSuggest(opts) {
  const results = await evaluateTriggers(opts.persona);
  const output = results.filter((r) => r.actionKind === "suggest" || r.severity !== "info");
  console.log(formatTriggerResults(output.length ? output : results, opts.json ? "json" : "text"));
}

async function cmdAct(opts) {
  const persona = opts.persona ?? "orchestrator";
  const ensure = runTaskboardEnsure();
  if (!ensure.ok) {
    console.error("taskboard:ensure FALHOU");
    if (!opts.dryRun) {
      postDialogue(persona, {
        type: "status",
        body: "⛔ Proactive act: taskboard offline. Trabalho técnico suspenso.",
      });
    }
    process.exit(1);
  }

  const results = await evaluateTriggers(persona);
  const toAct = results.filter((r) => r.actionKind === "act-dialogue");
  if (toAct.length === 0) {
    console.log("(nenhuma auto-ação dialogue pendente)");
    return;
  }

  for (const r of toAct) {
    appendProactiveLog({
      triggerId: r.id,
      action: opts.dryRun ? "act-dry-run" : "act",
      persona,
      issueId: r.issueId,
      severity: r.severity,
      summary: r.summary,
    });
    if (opts.dryRun) {
      console.log(`[dry-run] ${r.id} ${r.issueId ?? ""}`);
      continue;
    }
    const saved = postDialogue(persona, r.actPayload, r.issueId);
    console.log(`acted: ${r.id} → ${saved.id}`);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "--help" || cmd === "-h") usage(0);

try {
  const opts = parseArgs(rest);
  if (cmd === "check") await cmdCheck(opts);
  else if (cmd === "suggest") await cmdSuggest(opts);
  else if (cmd === "act") await cmdAct(opts);
  else usage(1);
} catch (err) {
  console.error(`proactive error: ${err.message}`);
  process.exit(1);
}
