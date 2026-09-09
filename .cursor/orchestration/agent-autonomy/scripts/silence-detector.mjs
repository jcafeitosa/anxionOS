#!/usr/bin/env node
/**
 * Cron silence-watch: detecta sessões ativas sem diálogo há 10+ minutos.
 * Registro sugerido: every 5m via orchestration:cron
 *
 * Usage:
 *   node silence-detector.mjs [--threshold 10m] [--dry-run]
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { appendAutonomyLog } from "../autonomy-log.mjs";
import { parseIntervalMs, repoRoot } from "../lib.mjs";
import { getOrchestrationPaths } from "../../agent-config/load-config.mjs";
import { listSilentSessions } from "../../agent-dialogue/session-tracker.mjs";

const pendingEscalatePath = join(
  getOrchestrationPaths().paths.autonomy,
  "pending-escalate.json",
);

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h${minutes % 60}min`;
}

function postBroadcast({ fromPersona, issueId, type, body, toPersona }) {
  const args = [
    join(repoRoot, ".cursor/orchestration/agent-dialogue/broadcast.mjs"),
    "post",
    "--from-persona",
    fromPersona,
    "--type",
    type,
    "--issue",
    issueId,
    "--body",
    body,
    "--mirror-taskboard",
  ];
  if (toPersona) args.push("--to-persona", toPersona);

  execFileSync(process.execPath, args, { cwd: repoRoot, stdio: "pipe" });
}

function parseArgs(argv) {
  const opts = { threshold: "10m", dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--threshold") opts.threshold = argv[++i];
    else if (argv[i] === "--dry-run") opts.dryRun = true;
    else throw new Error(`Unknown: ${argv[i]}`);
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const thresholdMs = parseIntervalMs(opts.threshold);
  const silent = listSilentSessions(thresholdMs);

  if (silent.length === 0) {
    console.log("silence-watch: nenhuma sessão silenciosa");
    return;
  }

  console.log(`silence-watch: ${silent.length} sessão(ões) sem diálogo há ${opts.threshold}+`);

  for (const session of silent) {
    const duration = formatDuration(session.silentForMs);
    const body =
      `@orchestrator Sessão **${session.persona}** em **${session.issueId}** sem broadcast há ${duration}. ` +
      `Último diálogo: ${session.lastDialogueAt ?? "nunca"}. Publicar \`status\` ou \`escalate\`.`;

    console.log(`  → ${session.persona} · ${session.issueId} · silent ${duration}`);

    if (opts.dryRun) continue;

    const type = session.silentForMs >= thresholdMs * 2 ? "escalate" : "status";

    try {
      postBroadcast({
        fromPersona: session.persona,
        toPersona: "orchestrator",
        issueId: session.issueId,
        type,
        body,
      });

      appendAutonomyLog({
        action: "silence-watch",
        resourceType: "sessions",
        resourceId: session.persona,
        persona: session.persona,
        issueId: session.issueId,
        details: { silentForMs: session.silentForMs, type },
      });
    } catch (err) {
      console.error(`  falha broadcast ${session.persona}: ${err.message}`);
      writeFileSync(
        pendingEscalatePath,
        `${JSON.stringify(
          {
            persona: session.persona,
            issueId: session.issueId,
            silentForMs: session.silentForMs,
            type: "escalate",
            body,
            createdAt: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    }
  }
}

try {
  main();
} catch (err) {
  console.error(`silence-detector error: ${err.message}`);
  process.exit(1);
}
