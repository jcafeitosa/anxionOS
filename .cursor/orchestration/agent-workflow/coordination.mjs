#!/usr/bin/env node
/**
 * CLI de coordenação multi-chat.
 *
 * Usage:
 *   npm run orchestration:coordination -- status [--issue ANX-N] [--json]
 *   npm run orchestration:coordination -- claim-check --issue ANX-N [--persona SLUG] [--acquire] [--broadcast]
 *   npm run orchestration:coordination -- release --issue ANX-N [--force]
 */

import { fileURLToPath } from "node:url";
import { getCliBrand } from "../agent-config/cli-brand.mjs";
import { formatIssueIdHint } from "../agent-config/load-config.mjs";
import {
  acquireIssueLock,
  findCrossChatConflicts,
  getCoordinationStatus,
  releaseIssueLock,
  resolveThreadId,
} from "./issue-coordination.mjs";

function usage(exitCode = 0) {
  console.log(`${getCliBrand()} — coordenação multi-chat

Commands:
  status [--issue ${formatIssueIdHint()}] [--json]
  claim-check --issue ${formatIssueIdHint()} [--persona SLUG] [--acquire] [--broadcast]
  release --issue ${formatIssueIdHint()} [--force]

Docs: .cursor/orchestration/MULTI-CHAT-COORDINATION.md`);
  process.exit(exitCode);
}

function parseOpts(argv) {
  const opts = {
    cmd: null,
    issueId: null,
    persona: null,
    acquire: false,
    broadcast: false,
    force: false,
    asJson: false,
  };
  if (argv.length === 0) usage(1);
  opts.cmd = argv[0];
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--acquire") opts.acquire = true;
    else if (a === "--broadcast") opts.broadcast = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--json") opts.asJson = true;
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

function printStatus(rows, asJson) {
  if (asJson) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (!rows.length) {
    console.log("(nenhuma issue com sessões ou locks)");
    return;
  }
  for (const row of rows) {
    const flag = row.conflict ? "CONFLICT" : "ok";
    console.log(`${row.issueId}\t${flag}\tlock=${row.lock?.threadId ?? "-"}`);
    for (const [key, group] of Object.entries(row.sessionThreads ?? {})) {
      console.log(`  thread ${group.threadId ?? key}: ${group.personas.join(", ")}`);
    }
  }
}

async function maybeBroadcastConflict(issueId, result, persona) {
  if (!result.conflict) return;
  const { spawnSync } = await import("node:child_process");
  const holders = result.holders
    .map((h) => `${h.threadId ?? h.threadKey} (${h.personas.join(", ")})`)
    .join("; ");
  const body =
    `Conflito cross-chat em ${issueId}: thread atual=${result.currentThreadId ?? "?"}; ` +
    `outro(s)=${holders || result.explicitLock?.threadId || "?"}`;
  const from = persona ?? process.env.DIALOGUE_FROM_PERSONA ?? "orchestrator";
  spawnSync(
    process.execPath,
    [
      new URL("../agent-dialogue/broadcast.mjs", import.meta.url).pathname,
      "--from-persona",
      from,
      "--type",
      "block",
      "--issue",
      issueId,
      "--body",
      body,
      "--evidence",
      `cmd:orchestration:coordination claim-check --issue ${issueId}`,
    ],
    { stdio: "inherit", cwd: process.cwd() },
  );
}

function cmdStatus(opts) {
  const rows = getCoordinationStatus(opts.issueId);
  printStatus(rows, opts.asJson);
}

async function cmdClaimCheck(opts) {
  if (!opts.issueId) throw new Error("claim-check requer --issue");
  const threadId = resolveThreadId();
  const result = findCrossChatConflicts(opts.issueId, threadId);

  if (opts.acquire && !result.conflict) {
    const acquired = acquireIssueLock(opts.issueId, opts.persona);
    if (opts.asJson) {
      console.log(JSON.stringify({ ...result, acquired }, null, 2));
    } else {
      console.log(`Lock adquirido: ${opts.issueId} · thread=${acquired.lock?.threadId ?? threadId}`);
    }
    return;
  }

  if (opts.broadcast && result.conflict) {
    await maybeBroadcastConflict(opts.issueId, result, opts.persona);
  }

  if (opts.asJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.conflict ? 1 : 0);
  }

  if (result.conflict) {
    console.error(`CONFLICT: ${opts.issueId} · thread atual=${threadId ?? "?"}`);
    for (const h of result.holders) {
      console.error(`  outro: ${h.threadId ?? h.threadKey} · ${h.personas.join(", ")}`);
    }
    if (result.explicitLock) {
      console.error(`  lock explícito: ${result.explicitLock.threadId}`);
    }
    process.exit(1);
  }
  console.log(`OK: ${opts.issueId} disponível para thread ${threadId ?? "?"}`);
}

function cmdRelease(opts) {
  if (!opts.issueId) throw new Error("release requer --issue");
  const out = releaseIssueLock(opts.issueId, resolveThreadId(), { force: opts.force });
  if (opts.asJson) {
    console.log(JSON.stringify(out, null, 2));
    process.exit(out.released ? 0 : 1);
  }
  if (!out.released) {
    console.error(`release falhou: ${out.reason}`);
    process.exit(1);
  }
  console.log(`Lock liberado: ${opts.issueId}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  (async () => {
    const argv = process.argv.slice(2);
    if (argv.includes("--help") || argv.includes("-h")) usage(0);
    try {
      const opts = parseOpts(argv);
      switch (opts.cmd) {
        case "status":
          cmdStatus(opts);
          break;
        case "claim-check":
          await cmdClaimCheck(opts);
          break;
        case "release":
          cmdRelease(opts);
          break;
        default:
          usage(1);
      }
    } catch (err) {
      console.error(`coordination error: ${err.message}`);
      process.exit(1);
    }
  })();
}
