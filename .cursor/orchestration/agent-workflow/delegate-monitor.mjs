#!/usr/bin/env node
/**
 * Monitor de delegações — sessões, hires, workflows; stale e no-issue.
 *
 * Usage:
 *   npm run orchestration:delegate-monitor [--issue ANX-N] [--json]
 */

import { fileURLToPath } from "node:url";
import { loadSessions } from "../agent-dialogue/session-tracker.mjs";
import { listActive } from "../agent-hire/roster.mjs";
import { fetchIssue } from "../agent-compliance/compliance-lib.mjs";
import { resolveTaskboardRouting } from "../agent-config/taskboard-routing.mjs";
import { SILENCE_THRESHOLD_MS, loadWorkflowState } from "../agent-workflow/state.mjs";
import { readDialogueMessages } from "../agent-dialogue/dialogue-log.mjs";

export const DEFAULT_STALE_MS = SILENCE_THRESHOLD_MS;

export function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h${m}min` : `${h}h`;
}

export function isDelegationStale(row, thresholdMs = DEFAULT_STALE_MS) {
  return (row.silentForMs ?? 0) >= thresholdMs;
}

function lastDialogueMeta(issueId, persona) {
  const msgs = readDialogueMessages({ issueId }).filter((m) => {
    const slug = m.from?.persona?.role ?? m.from?.role;
    return slug === persona;
  });
  const last = msgs[msgs.length - 1];
  return last
    ? { at: last.timestamp, type: last.type }
    : { at: null, type: null };
}

function silentForMsFrom(startIso, lastIso) {
  const ref = lastIso ?? startIso;
  if (!ref) return 0;
  return Date.now() - Date.parse(ref);
}

export function delegationFromSession(session) {
  const silentForMs = silentForMsFrom(session.startedAt, session.lastDialogueAt);
  const meta = session.issueId
    ? lastDialogueMeta(session.issueId, session.persona)
    : { at: session.lastDialogueAt, type: null };
  return {
    kind: "session",
    persona: session.persona,
    issueId: session.issueId ?? null,
    startedAt: session.startedAt,
    lastDialogueAt: meta.at ?? session.lastDialogueAt ?? null,
    lastDialogueType: meta.type,
    silentForMs,
    stale: isDelegationStale({ silentForMs }),
    noIssue: !session.issueId,
    sources: ["active-sessions.json"],
    threadId: session.threadId ?? null,
    workflowStep: null,
    subagentType: null,
    hireId: null,
    hiredBy: null,
  };
}

export function delegationFromHire(hire) {
  const meta = hire.issueId
    ? lastDialogueMeta(hire.issueId, hire.slug)
    : { at: null, type: null };
  const silentForMs = silentForMsFrom(hire.hiredAt, meta.at);
  const stale = isDelegationStale({ silentForMs });
  return {
    kind: "hire",
    persona: hire.slug,
    issueId: hire.issueId ?? null,
    startedAt: hire.hiredAt,
    lastDialogueAt: meta.at,
    lastDialogueType: meta.type,
    silentForMs,
    stale,
    noIssue: !hire.issueId,
    sources: ["active-on-demand.json"],
    threadId: null,
    workflowStep: null,
    subagentType: hire.cursorSubagentType ?? null,
    hireId: hire.id,
    hiredBy: hire.hiredBy,
  };
}

export function delegationFromWorkflow(wf) {
  const lastDialogueAt = wf.checklist?.lastDialogueAt ?? wf.updatedAt ?? null;
  const silentForMs = silentForMsFrom(wf.updatedAt ?? wf.startedAt, lastDialogueAt);
  return {
    kind: "workflow",
    persona: wf.persona,
    issueId: wf.issueId ?? null,
    startedAt: wf.updatedAt ?? null,
    lastDialogueAt,
    lastDialogueType: null,
    silentForMs,
    stale: isDelegationStale({ silentForMs }),
    noIssue: !wf.issueId,
    sources: ["workflow-state.json"],
    threadId: null,
    workflowStep: wf.step ?? null,
    subagentType: null,
    hireId: null,
    hiredBy: null,
  };
}

export function mergeDelegations(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.persona}::${row.issueId ?? "NO_ISSUE"}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...row, sources: [...(row.sources ?? [])] });
      continue;
    }
    const rank = { session: 3, hire: 2, workflow: 1 };
    const winner = rank[row.kind] >= rank[existing.kind] ? row : existing;
    const loser = winner === row ? existing : row;
    const merged = {
      ...winner,
      sources: [...new Set([...(winner.sources ?? []), ...(loser.sources ?? [])])],
      hiredBy: winner.hiredBy ?? loser.hiredBy,
      subagentType: winner.subagentType ?? loser.subagentType,
      workflowStep: winner.workflowStep ?? loser.workflowStep,
      threadId: winner.threadId ?? loser.threadId,
      hireId: winner.hireId ?? loser.hireId,
      silentForMs: Math.min(winner.silentForMs ?? 0, loser.silentForMs ?? 0),
      stale: winner.stale || loser.stale,
    };
    byKey.set(key, merged);
  }
  return [...byKey.values()];
}

export function formatMarkdownTable(rows) {
  if (!rows.length) return "_Nenhuma delegação ativa._\n";
  const header = "| Issue | Persona | Board | Tipo | Silêncio | Último dialogue | Step | Fontes |";
  const sep = "| --- | --- | --- | --- | --- | --- | --- | --- |";
  const lines = rows.map((r) => {
    const issue = r.issueId ?? "—";
    const board = r.board ?? "—";
    const staleMark = r.stale ? " ⚠️" : "";
    const silent = formatDuration(r.silentForMs ?? 0);
    const last = r.lastDialogueAt
      ? `${r.lastDialogueType ?? "?"} @ ${String(r.lastDialogueAt).slice(11, 19)}`
      : "—";
    const wf = r.workflowStep ?? "—";
    const sources = (r.sources ?? []).join(", ");
    return `| ${issue} | ${r.persona} | ${board} | ${r.kind}${staleMark} | ${silent} | ${last} | ${wf} | ${sources} |`;
  });
  return [header, sep, ...lines].join("\n") + "\n";
}

export function evaluateDelegationFeedbackWarnings(
  persona,
  issueId,
  session,
  issue,
  thresholdMs = DEFAULT_STALE_MS,
) {
  const warnings = [];
  if (!session || session.issueId !== issueId) return warnings;
  if (!issue || issue.status !== "in_progress") return warnings;
  if (!isExecutorLike(persona)) return warnings;

  const silentForMs = silentForMsFrom(session.startedAt, session.lastDialogueAt);
  if (!isDelegationStale({ silentForMs }, thresholdMs)) return warnings;

  warnings.push({
    code: "DELEGATION_NO_FEEDBACK",
    message: `Delegacao ${persona} em ${issueId} sem dialogue recente (>10min)`,
    fix: `npm run orchestration:broadcast -- --from-persona ${persona} --type status --issue ${issueId} --body "status delegacao" --evidence "cmd:delegate-monitor"`,
  });
  return warnings;
}

function isExecutorLike(persona) {
  return persona?.endsWith("-executor") || persona === "generalPurpose";
}

export function evaluateParentDelegationWarnings(rows, thresholdMs = DEFAULT_STALE_MS) {
  const warnings = [];
  const staleExecutors = rows.filter(
    (r) => r.stale && (isExecutorLike(r.persona) || r.kind === "hire"),
  );
  if (staleExecutors.length === 0) return warnings;

  const byIssue = new Map();
  for (const row of staleExecutors) {
    const key = row.issueId ?? "NO_ISSUE";
    if (!byIssue.has(key)) byIssue.set(key, []);
    byIssue.get(key).push(row);
  }

  for (const [issueId, issueRows] of byIssue) {
    const personas = issueRows.map((r) => r.persona).join(", ");
    warnings.push({
      code: "PARENT_DELEGATION_STALE",
      message: `Delegações stale em ${issueId}: ${personas} (>${formatDuration(thresholdMs)} sem dialogue)`,
      fix:
        `npm run orchestration:delegate-monitor -- stale --issue ${issueId}; ` +
        "cobrar status dos subagentes ou npm run orchestration:lifecycle-cleanup",
    });
  }
  return warnings;
}

export async function collectDelegationRows(issueFilter = null) {
  const store = loadSessions();
  const sessions = Object.values(store.sessions).filter(
    (s) => !issueFilter || s.issueId === issueFilter,
  );
  const hires = listActive(issueFilter);
  const workflowRows = [];

  for (const s of sessions) {
    const wf = s.issueId ? loadWorkflowState(s.persona, s.issueId) : null;
    if (wf?.issueId) {
      workflowRows.push(
        delegationFromWorkflow({
          persona: s.persona,
          issueId: wf.issueId,
          step: wf.step,
          updatedAt: wf.updatedAt,
          checklist: wf.checklist,
        }),
      );
    }
  }

  const raw = [
    ...sessions.map(delegationFromSession),
    ...hires.map(delegationFromHire),
    ...workflowRows,
  ];
  const merged = mergeDelegations(raw);

  for (const row of merged) {
    if (row.issueId) {
      const issue = await fetchIssue(row.issueId);
      row.issueStatus = issue?.status ?? null;
      row.issueMissing = !issue;
      if (row.issueMissing) row.noIssue = true;
      const routing = resolveTaskboardRouting({ issueId: row.issueId, issue });
      row.board = routing.board;
      row.scope = routing.scope;
    } else {
      row.board = "cursor";
      row.scope = "framework";
    }
  }

  return merged;
}

export function bucketDelegations(rows) {
  const active = [];
  const stale = [];
  const noIssue = [];

  for (const row of rows) {
    if (row.noIssue || row.issueMissing) noIssue.push(row);
    else if (row.stale) stale.push(row);
    else active.push(row);
  }

  return { active, stale, noIssue };
}

function parseArgs(argv) {
  const opts = { cmd: argv[0] ?? "list", issueId: null, asJson: false, threshold: "10m" };
  const start = ["list", "status", "stale", "summary"].includes(opts.cmd) ? 1 : 0;
  if (!["list", "status", "stale", "summary"].includes(opts.cmd)) {
    opts.cmd = "list";
  }
  for (let i = start; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issueId = argv[++i]?.toUpperCase();
    else if (a === "--json") opts.asJson = true;
    else if (a === "--threshold") opts.threshold = argv[++i];
    else if (a === "--help" || a === "-h") return { ...opts, help: true };
    else throw new Error(`Opcao desconhecida: ${a}`);
  }
  return opts;
}

function printBuckets(buckets) {
  const fmt = (rows, title) => {
    console.log(`\n## ${title} (${rows.length})`);
    if (!rows.length) return console.log("  (nenhum)");
    console.log(formatMarkdownTable(rows));
  };
  fmt(buckets.active, "active");
  fmt(buckets.stale, "stale");
  fmt(buckets.noIssue, "no-issue");
}

export function formatIssueSummary(issueId, rows, generatedAt, thresholdMs) {
  const filtered = rows.filter((r) => r.issueId === issueId);
  const stale = filtered.filter((r) => r.stale);
  const lines = [
    `## Delegações — ${issueId}`,
    "",
    `- **Ativas:** ${filtered.length}`,
    `- **Stale (>${formatDuration(thresholdMs)}):** ${stale.length}`,
    `- **Gerado:** ${generatedAt}`,
    "",
    formatMarkdownTable(filtered),
  ];
  return lines.join("\n") + "\n";
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage:
  npm run orchestration:delegate-monitor -- list [--json]
  npm run orchestration:delegate-monitor -- status [--json]
  npm run orchestration:delegate-monitor -- stale [--threshold 10m] [--json]
  npm run orchestration:delegate-monitor -- summary --issue ANX-N [--json]`);
    process.exit(0);
  }

  const { parseIntervalMs } = await import("../agent-autonomy/lib.mjs");
  const thresholdMs = parseIntervalMs(opts.threshold);
  const issueFilter = opts.cmd === "summary" ? opts.issueId : opts.issueId;
  const rows = await collectDelegationRows(issueFilter);
  for (const row of rows) {
    row.stale = isDelegationStale(row, thresholdMs);
  }
  const buckets = bucketDelegations(rows);
  const generatedAt = new Date().toISOString();
  const snapshot = {
    ok: buckets.noIssue.length === 0 && buckets.stale.length === 0,
    generatedAt,
    thresholdMs,
    counts: {
      active: buckets.active.length,
      stale: buckets.stale.length,
      noIssue: buckets.noIssue.length,
      total: rows.length,
    },
    delegations: rows,
    inProgressIssues: [...new Set(rows.map((r) => r.issueId).filter(Boolean))].sort(),
    buckets,
    table: formatMarkdownTable(rows),
  };

  if (opts.cmd === "summary") {
    if (!opts.issueId) throw new Error("summary requer --issue ANX-N");
    if (opts.asJson) {
      console.log(JSON.stringify({ issueId: opts.issueId, delegations: rows.filter((r) => r.issueId === opts.issueId), generatedAt }, null, 2));
      return;
    }
    console.log(formatIssueSummary(opts.issueId, rows, generatedAt, thresholdMs));
    return;
  }

  if (opts.cmd === "stale") {
    const staleRows = rows.filter((r) => r.stale);
    if (opts.asJson) {
      console.log(JSON.stringify({ stale: staleRows, generatedAt }, null, 2));
      return;
    }
    console.log(`<!-- DELEGATE_MONITOR_STALE: ${generatedAt} -->\n`);
    console.log(`**Stale (>${opts.threshold}):** ${staleRows.length}\n`);
    console.log(formatMarkdownTable(staleRows));
    return;
  }

  if (opts.cmd === "status" || opts.asJson) {
    console.log(JSON.stringify(snapshot, null, 2));
    if (!snapshot.ok && opts.cmd === "status") process.exit(1);
    return;
  }

  console.log(`<!-- DELEGATE_MONITOR_LIST: ${generatedAt} -->\n`);
  console.log(`**Delegações ativas:** ${rows.length} · **Issues:** ${snapshot.inProgressIssues.length}\n`);
  console.log(formatMarkdownTable(rows));
  if (buckets.noIssue.length) {
    console.error("\n⛔ Delegacoes sem issue binding — claim ANX-* antes de trabalhar");
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error(`delegate-monitor error: ${err.message}`);
    process.exit(1);
  });
}
