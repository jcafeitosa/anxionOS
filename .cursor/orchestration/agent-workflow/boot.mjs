#!/usr/bin/env node
/**
 * Bootstrap de sessão — carrega framework de orquestração (AGENTS.md § Framework).
 *
 * Usage:
 *   npm run orchestration:boot
 *   npm run orchestration:boot -- --persona orchestrator
 *   npm run orchestration:boot -- --skip-taskboard   # meta-tooling / framework-only
 *   npm run orchestration:boot -- --json
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getCliBrand } from "../agent-config/cli-brand.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function parseArgs(argv) {
  const opts = { persona: "orchestrator", json: false, skipTaskboard: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--json") opts.json = true;
    else if (a === "--skip-taskboard") opts.skipTaskboard = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

function runNpm(script, args = []) {
  const result = spawnSync("npm", ["run", script, "--", ...args], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    script,
    args,
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function usage() {
  console.log(`${getCliBrand()} — boot (carregar framework)

Usage:
  npm run orchestration:boot [--persona SLUG] [--json] [--skip-taskboard]

Executa: taskboard:ensure (opcional) → lifecycle-cleanup → proactive check →
chat --check-pending → dispatch status → dispatch inject

Docs: AGENTS.md § Framework de orquestração · ONBOARDING.md`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return;
  }

  const steps = [];

  if (!opts.skipTaskboard) {
    const ensure = runNpm("taskboard:ensure");
    steps.push({ name: "taskboard:ensure", ok: ensure.ok });
    if (!ensure.ok) {
      const payload = {
        ok: false,
        persona: opts.persona,
        failedAt: "taskboard:ensure",
        steps,
        hint: "Board offline — subir taskboard ou usar --skip-taskboard para framework-only",
      };
      if (opts.json) console.log(JSON.stringify(payload, null, 2));
      else {
        console.error("taskboard offline — boot abortado.");
        if (ensure.stderr) console.error(ensure.stderr.trim());
        console.error("Use: npm run orchestration:boot -- --skip-taskboard (somente meta-tooling)");
      }
      process.exit(1);
    }
  }

  const lifecycle = runNpm("orchestration:lifecycle-cleanup", ["--json"]);
  steps.push({ name: "orchestration:lifecycle-cleanup", ok: lifecycle.ok });

  const proactive = runNpm("orchestration:proactive", ["check", "--persona", opts.persona]);
  steps.push({ name: "orchestration:proactive", ok: proactive.ok });

  const chat = runNpm("orchestration:chat", ["--check-pending"]);
  steps.push({
    name: "orchestration:chat",
    ok: chat.ok,
    hasPending: chat.stdout.includes("CURSOR_CHAT_DIALOGUE"),
  });

  const dispatchStatus = runNpm("orchestration:dispatch", ["status", "--json"]);
  steps.push({ name: "orchestration:dispatch status", ok: dispatchStatus.ok });

  const dispatchInject = runNpm("orchestration:dispatch", ["inject", "--limit", "3"]);
  const hasPendingDispatch = dispatchInject.stdout.includes("CURSOR_DISPATCH_QUEUE");
  steps.push({
    name: "orchestration:dispatch inject",
    ok: dispatchInject.ok,
    hasPending: hasPendingDispatch,
  });

  const ok = steps.every((s) => s.ok);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          ok,
          persona: opts.persona,
          skipTaskboard: opts.skipTaskboard,
          steps,
          dispatchPending: hasPendingDispatch,
          chatPending: chat.stdout.includes("CURSOR_CHAT_DIALOGUE"),
        },
        null,
        2,
      ),
    );
    process.exit(ok ? 0 : 1);
  }

  console.log(`${getCliBrand()} — boot (${opts.persona})\n`);
  for (const step of steps) {
    console.log(`${step.ok ? "✓" : "✗"} ${step.name}`);
  }
  if (chat.stdout.includes("CURSOR_CHAT_DIALOGUE")) {
    console.log("\n--- Pending chat (colar no turno) ---\n");
    console.log(chat.stdout);
  }
  if (hasPendingDispatch) {
    console.log("\n--- Dispatch queue (invocar Task AGORA) ---\n");
    console.log(dispatchInject.stdout);
    console.log("\nJSON batch: npm run orchestration:dispatch -- spawn-plan --json");
  }
  process.exit(ok ? 0 : 1);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    main();
  } catch (err) {
    console.error(`boot error: ${err.message}`);
    process.exit(1);
  }
}
