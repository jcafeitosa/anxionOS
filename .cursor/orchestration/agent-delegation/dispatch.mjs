#!/usr/bin/env node
/**
 * CLI dispatch queue — teammates Grok-style → Task subagents Cursor.
 *
 * Usage:
 *   npm run orchestration:dispatch -- list [--json]
 *   npm run orchestration:dispatch -- inject [--issue ANX-N]
 *   npm run orchestration:dispatch -- next [--json]
 *   npm run orchestration:dispatch -- enqueue --persona SLUG --issue ANX-N --reason TEXT [--evidence TEXT]
 *   npm run orchestration:dispatch -- mark-dispatched --id UUID [--task-agent-id ID]
 *   npm run orchestration:dispatch -- mark-done --id UUID --evidence TEXT
 *   npm run orchestration:dispatch -- spawn-plan [--issue ANX-N] [--json]
 */

import { fileURLToPath } from "node:url";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import {
  buildSpawnPlan,
  buildTaskPrompt,
  formatDispatchInjectBlock,
} from "./dispatch-builder.mjs";
import {
  countByStatus,
  enqueueDispatch,
  getDispatch,
  getNextPending,
  listDispatches,
  markDispatched,
  markDone,
  markFailed,
} from "./dispatch-queue.mjs";

function parseArgs(argv) {
  const opts = {
    cmd: argv[0] ?? "list",
    issueId: null,
    persona: null,
    id: null,
    reason: null,
    evidence: null,
    taskAgentId: null,
    subagentType: null,
    priority: 3,
    asJson: false,
    limit: 5,
  };

  if (
    ![
      "list",
      "inject",
      "next",
      "spawn-plan",
      "enqueue",
      "mark-dispatched",
      "mark-done",
      "mark-failed",
      "status",
    ].includes(opts.cmd)
  ) {
    opts.cmd = "list";
  }

  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issueId = argv[++i]?.toUpperCase();
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--reason") opts.reason = argv[++i];
    else if (a === "--evidence") opts.evidence = argv[++i];
    else if (a === "--task-agent-id") opts.taskAgentId = argv[++i];
    else if (a === "--subagent-type") opts.subagentType = argv[++i];
    else if (a === "--priority") opts.priority = Number(argv[++i]);
    else if (a === "--limit") opts.limit = Number(argv[++i]);
    else if (a === "--json") opts.asJson = true;
    else if (a === "--help" || a === "-h") return { ...opts, help: true };
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

function usage() {
  console.log(`${getCliBrand()} — dispatch queue (Grok Bot → Cursor Task)

Commands:
  list [--issue ANX-N] [--json]           Listar fila
  inject [--issue ANX-N] [--limit N]      Bloco para parent spawnar Task AGORA
  spawn-plan [--issue ANX-N] [--json]     JSON Task batch (executor + crítico pareado)
  next [--json]                           Próximo pending + prompt
  status [--json]                         Contagens por status
  enqueue --persona SLUG --issue ANX-N --reason TEXT [--evidence TEXT]
  mark-dispatched --id UUID [--task-agent-id ID]
  mark-done --id UUID --evidence TEXT
  mark-failed --id UUID --evidence TEXT

Docs: .cursor/orchestration/GROK-BOT-PARITY.md`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return;
  }

  switch (opts.cmd) {
    case "list": {
      const items = listDispatches({ status: null, issueId: opts.issueId });
      if (opts.asJson) {
        console.log(JSON.stringify({ items, counts: countByStatus() }, null, 2));
        return;
      }
      if (!items.length) {
        console.log("(fila vazia)");
        return;
      }
      for (const item of items) {
        console.log(
          `${item.status}\t${item.persona}\t${item.subagentType}\t${item.issueId}\t${item.id.slice(0, 8)}`,
        );
      }
      return;
    }

    case "inject": {
      const pending = listDispatches({ status: "pending", issueId: opts.issueId }).slice(
        0,
        opts.limit,
      );
      if (!pending.length) {
        console.log("(nenhum dispatch pendente)");
        return;
      }
      console.log(formatDispatchInjectBlock(pending));
      return;
    }

    case "spawn-plan": {
      const pending = listDispatches({ status: "pending", issueId: opts.issueId }).slice(
        0,
        opts.limit,
      );
      const plan = buildSpawnPlan(pending);
      if (opts.asJson) {
        console.log(JSON.stringify(plan, null, 2));
        return;
      }
      if (!plan.tasks.length) {
        console.log("(nenhum dispatch pendente)");
        return;
      }
      console.log(`Spawn plan: ${plan.tasks.length} task(s)`);
      for (const task of plan.tasks) {
        console.log(`- ${task.persona} → ${task.subagent_type} · ${task.issueId} (${task.dispatchId.slice(0, 8)})`);
      }
      console.log("\nUse --json para payload completo (prompts + Task fields).");
      return;
    }

    case "next": {
      const next = getNextPending();
      if (!next) {
        if (opts.asJson) console.log(JSON.stringify({ next: null }));
        else console.log("(nenhum dispatch pendente)");
        return;
      }
      const payload = {
        ...next,
        prompt: buildTaskPrompt(next),
        taskInstruction: {
          subagent_type: next.subagentType,
          run_in_background: next.runInBackground,
          description: `${next.persona} · ${next.issueId}`,
        },
      };
      if (opts.asJson) {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }
      console.log(`Next: ${next.persona} → ${next.subagentType} · ${next.issueId}`);
      console.log(`ID: ${next.id}`);
      console.log("\n--- PROMPT ---\n");
      console.log(payload.prompt);
      return;
    }

    case "status": {
      const counts = countByStatus();
      if (opts.asJson) {
        console.log(JSON.stringify({ counts, generatedAt: new Date().toISOString() }, null, 2));
        return;
      }
      console.log(
        `pending=${counts.pending} dispatched=${counts.dispatched} running=${counts.running} done=${counts.done} failed=${counts.failed}`,
      );
      return;
    }

    case "enqueue": {
      if (!opts.persona || !opts.issueId || !opts.reason) {
        throw new Error("enqueue requer --persona --issue --reason");
      }
      const item = enqueueDispatch({
        persona: opts.persona,
        issueId: opts.issueId,
        reason: opts.reason,
        evidence: opts.evidence,
        subagentType: opts.subagentType,
        priority: opts.priority,
        source: "cli",
      });
      if (opts.asJson) console.log(JSON.stringify(item, null, 2));
      else console.log(`✓ Enqueued: ${item.persona} · ${item.issueId} · ${item.id}`);
      return;
    }

    case "mark-dispatched": {
      if (!opts.id) throw new Error("mark-dispatched requer --id");
      const item = markDispatched(opts.id, opts.taskAgentId);
      if (opts.asJson) console.log(JSON.stringify(item, null, 2));
      else console.log(`✓ Dispatched: ${item.id}`);
      return;
    }

    case "mark-done": {
      if (!opts.id || !opts.evidence) throw new Error("mark-done requer --id --evidence");
      const item = markDone(opts.id, opts.evidence);
      if (opts.asJson) console.log(JSON.stringify(item, null, 2));
      else console.log(`✓ Done: ${item.id}`);
      return;
    }

    case "mark-failed": {
      if (!opts.id) throw new Error("mark-failed requer --id");
      const item = markFailed(opts.id, opts.evidence ?? "failed");
      if (opts.asJson) console.log(JSON.stringify(item, null, 2));
      else console.log(`✗ Failed: ${item.id}`);
      return;
    }

    default:
      usage();
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error(`dispatch error: ${err.message}`);
    process.exit(1);
  });
}
