#!/usr/bin/env node
/**
 * Lifecycle cleanup — encerra sessões órfãs e dispensa hires stale.
 *
 * Usage:
 *   npm run orchestration:lifecycle-cleanup [--dry-run] [--json]
 *   npm run orchestration:lifecycle-cleanup -- drain-escalate
 */

import { fileURLToPath } from "node:url";
import { listActive, dismissHire } from "../agent-hire/roster.mjs";
import { fetchIssue } from "../agent-compliance/compliance-lib.mjs";
import { readDialogueMessages } from "../agent-dialogue/dialogue-log.mjs";
import { endSession, loadSessions } from "../agent-dialogue/session-tracker.mjs";
import { drainPendingEscalation, readPendingEscalation } from "../agent-autonomy/pending-escalate.mjs";
import { appendAutonomyLog } from "../agent-autonomy/autonomy-log.mjs";
import { parseIntervalMs } from "../agent-autonomy/lib.mjs";

export const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_HIRE_TTL_MS = 12 * 60 * 60 * 1000;
const TERMINAL_STATUSES = new Set(["done", "canceled"]);

function lastDialogueAtForPersona(issueId, persona) {
  const msgs = readDialogueMessages({ issueId }).filter((m) => {
    const slug = m.from?.persona?.role ?? m.from?.role;
    return slug === persona;
  });
  const last = msgs[msgs.length - 1];
  return last?.timestamp ?? null;
}

function silentMsSince(iso) {
  if (!iso) return Infinity;
  return Date.now() - Date.parse(iso);
}

/**
 * @param {{ dryRun?: boolean, sessionTtlMs?: number, hireTtlMs?: number }} opts
 */
export async function cleanupStaleLifecycle(opts = {}) {
  const dryRun = opts.dryRun === true;
  const sessionTtlMs = opts.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
  const hireTtlMs = opts.hireTtlMs ?? DEFAULT_HIRE_TTL_MS;
  const actions = [];

  const store = loadSessions();
  for (const session of Object.values(store.sessions)) {
    const issue = session.issueId ? await fetchIssue(session.issueId) : null;
    const status = issue?.status ?? null;
    const sessionAge = silentMsSince(session.startedAt);
    let reason = null;

    if (!session.issueId) reason = "no-issue-binding";
    else if (!issue) reason = "issue-missing";
    else if (TERMINAL_STATUSES.has(status)) reason = `issue-${status}`;
    else if (sessionAge >= sessionTtlMs) reason = "session-ttl";

    if (!reason) continue;

    actions.push({
      kind: "session-end",
      persona: session.persona,
      issueId: session.issueId,
      reason,
      dryRun,
    });

    if (!dryRun) {
      try {
        endSession(session.persona, { force: true });
        appendAutonomyLog({
          script: "lifecycle-cleanup",
          action: "session-end",
          persona: session.persona,
          issueId: session.issueId,
          reason,
        });
      } catch (err) {
        actions[actions.length - 1].error = err.message;
      }
    }
  }

  for (const hire of listActive()) {
    const issue = hire.issueId ? await fetchIssue(hire.issueId) : null;
    const status = issue?.status ?? null;
    const lastDialogue = hire.issueId
      ? lastDialogueAtForPersona(hire.issueId, hire.slug)
      : null;
    const silentSinceHire = silentMsSince(hire.hiredAt);
    const silentSinceDialogue = lastDialogue
      ? silentMsSince(lastDialogue)
      : silentSinceHire;
    let reason = null;

    if (!hire.issueId) reason = "no-issue-binding";
    else if (!issue) reason = "issue-missing";
    else if (TERMINAL_STATUSES.has(status)) reason = `issue-${status}`;
    else if (silentSinceDialogue >= hireTtlMs) reason = "hire-ttl";

    if (!reason) continue;

    actions.push({
      kind: "hire-dismiss",
      hireId: hire.id,
      persona: hire.slug,
      issueId: hire.issueId,
      reason,
      dryRun,
    });

    if (!dryRun) {
      try {
        dismissHire(hire.id, {
          dismissedBy: "lifecycle-cleanup",
          evidence: `auto-dismiss: ${reason}`,
          rejected: false,
        });
        appendAutonomyLog({
          script: "lifecycle-cleanup",
          action: "hire-dismiss",
          hireId: hire.id,
          persona: hire.slug,
          issueId: hire.issueId,
          reason,
        });
      } catch (err) {
        actions[actions.length - 1].error = err.message;
      }
    }
  }

  return {
    dryRun,
    sessionTtlMs,
    hireTtlMs,
    actions,
    counts: {
      sessionsEnded: actions.filter((a) => a.kind === "session-end" && !a.error).length,
      hiresDismissed: actions.filter((a) => a.kind === "hire-dismiss" && !a.error).length,
      errors: actions.filter((a) => a.error).length,
    },
  };
}

export function drainEscalationQueue(opts = {}) {
  const pending = readPendingEscalation(opts.projectRoot);
  if (!pending) return { drained: false, entry: null };
  const entry = drainPendingEscalation({
    acknowledgedBy: opts.acknowledgedBy ?? "lifecycle-cleanup",
    projectRoot: opts.projectRoot,
  });
  if (entry) {
    appendAutonomyLog({
      script: "lifecycle-cleanup",
      action: "drain-escalate",
      reason: entry.reason,
      issueId: entry.issueId,
      persona: entry.persona,
    });
  }
  return { drained: Boolean(entry), entry };
}

function parseArgs(argv) {
  const opts = { dryRun: false, asJson: false, cmd: "cleanup" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--json") opts.asJson = true;
    else if (a === "--session-ttl") opts.sessionTtlMs = parseIntervalMs(argv[++i]);
    else if (a === "--hire-ttl") opts.hireTtlMs = parseIntervalMs(argv[++i]);
    else if (a === "drain-escalate") opts.cmd = "drain-escalate";
    else if (a === "--help" || a === "-h") return { ...opts, help: true };
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage:
  npm run orchestration:lifecycle-cleanup [--dry-run] [--json]
  npm run orchestration:lifecycle-cleanup -- drain-escalate [--json]

Encerra sessões quando issue done/canceled/TTL e dispensa hires stale.`);
    process.exit(0);
  }

  if (opts.cmd === "drain-escalate") {
    const result = drainEscalationQueue();
    if (opts.asJson) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (!result.drained) {
      console.log("(nenhuma escalação pendente)");
      return;
    }
    console.log(`Escalation drenada: ${result.entry.reason} · ${result.entry.issueId ?? "?"}`);
    return;
  }

  const result = await cleanupStaleLifecycle(opts);
  if (opts.asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(
    `lifecycle-cleanup${result.dryRun ? " [dry-run]" : ""}: ` +
      `${result.counts.sessionsEnded} sessão(ões), ${result.counts.hiresDismissed} hire(s), ` +
      `${result.counts.errors} erro(s)`,
  );
  for (const action of result.actions) {
    const mark = action.error ? "ERR" : action.dryRun ? "DRY" : "OK";
    console.log(`  [${mark}] ${action.kind} ${action.persona ?? action.hireId} · ${action.issueId ?? "-"} · ${action.reason}`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error(`lifecycle-cleanup error: ${err.message}`);
    process.exit(1);
  });
}
