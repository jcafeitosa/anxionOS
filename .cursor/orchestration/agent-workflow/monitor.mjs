#!/usr/bin/env node
/**
 * CLI de workflow individual — status, monitor Level C, próxima ação.
 *
 * Usage:
 *   node monitor.mjs status --persona SLUG --issue ANX-N [--json]
 *   node monitor.mjs next --persona SLUG --issue ANX-N [--json]
 *   node monitor.mjs monitor [--level C] [--json]
 *   node monitor.mjs sync --persona SLUG --issue ANX-N [--json]
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getActiveSession } from "../agent-dialogue/session-tracker.mjs";
import { readDialogueMessages } from "../agent-dialogue/dialogue-log.mjs";
import { getPersona } from "../agent-dialogue/personas.mjs";
import { LEVEL_C } from "../agent-hire/levels.mjs";
import { listOnDemandForIssue } from "../agent-hire/registry.mjs";
import { suggestNextAction } from "./decision-tree.mjs";
import {
  loadWorkflowState,
  loadAllWorkflowStates,
  repoRoot,
  saveWorkflowState,
  SILENCE_THRESHOLD_MS,
  workflowsDir,
} from "./state.mjs";

const baseUrl = (
  process.env.TASKBOARD_URL ??
  process.env.CODEX_TASKBOARD_URL ??
  "http://127.0.0.1:47823"
).replace(/\/$/, "");

function parseArgs(argv) {
  const args = { cmd: argv[0], json: false, persona: null, issue: null, level: null };
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--persona") args.persona = argv[++i];
    else if (a === "--issue") args.issue = argv[++i];
    else if (a === "--level") args.level = argv[++i];
  }
  return args;
}

async function fetchIssue(issueId) {
  try {
    const res = await fetch(`${baseUrl}/api/tasks`);
    if (!res.ok) return null;
    const data = await res.json();
    const tasks = data.tasks ?? (Array.isArray(data) ? data : []);
    return tasks.find((t) => t.identifier === issueId || t.id === issueId) ?? null;
  } catch {
    return null;
  }
}

async function taskboardOnline() {
  try {
    const res = await fetch(`${baseUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

const MAC_TASKCTL =
  "/Applications/Codex Taskboard.app/Contents/Resources/bin/taskctl";

function resolveTaskctl() {
  const fromPath = spawnSync("which", ["taskctl"], { encoding: "utf8" });
  if (fromPath.status === 0 && fromPath.stdout.trim()) {
    return fromPath.stdout.trim();
  }
  if (existsSync(MAC_TASKCTL)) return MAC_TASKCTL;
  return null;
}

const taskctl = resolveTaskctl();

function agentsMdExists() {
  return existsSync(join(repoRoot, "AGENTS.md"));
}

function fetchLatestTaskboardCommentAt(issueId) {
  if (!taskctl) return null;
  try {
    const data = JSON.parse(execFileSync(taskctl, ["comment", "list", issueId, "--json"], { encoding: "utf8" }));
    const comments = data.comments ?? [];
    if (!comments.length) return null;
    const latest = comments.reduce((a, b) =>
      new Date(a.createdAt) >= new Date(b.createdAt) ? a : b,
    );
    return latest.createdAt ?? null;
  } catch {
    return null;
  }
}

function stepAfterG0Complete(currentStep, checklist) {
  if (currentStep !== "pre-work-g0") return currentStep;
  if (!checklist.agentsMdRead || !checklist.taskboardEnsure) return currentStep;
  if (!checklist.sessionStarted || !checklist.ackPosted) return "ack-delegation";
  return "implement";
}

function dialogueForIssue(issueId, personaSlug) {
  const msgs = readDialogueMessages({ issueId, limit: 500 });
  const fromPersona = msgs.filter(
    (m) => m.from?.persona?.role === personaSlug || m.from?.role === personaSlug,
  );
  const types = new Set(msgs.map((m) => m.type));
  const last = msgs.length ? msgs[msgs.length - 1] : null;
  const lastFromPersona = fromPersona.length ? fromPersona[fromPersona.length - 1] : null;
  return {
    total: msgs.length,
    types: [...types],
    hasAck: types.has("ack"),
    hasStatus: types.has("status"),
    hasHandoff: types.has("handoff"),
    hasVerdict: types.has("verdict"),
    lastAt: last?.timestamp ?? null,
    lastFromPersonaAt: lastFromPersona?.timestamp ?? null,
    g1Pass: msgs.some((m) => m.type === "verdict" && /PASS/i.test(m.body ?? "")),
    g1Changes: msgs.some((m) => m.type === "verdict" && /CHANGES_REQUIRED/i.test(m.body ?? "")),
    handoffReceived: msgs.some((m) => m.type === "handoff"),
    verdictPosted: msgs.some(
      (m) =>
        m.type === "verdict" &&
        (m.from?.persona?.role === personaSlug || m.from?.role === personaSlug),
    ),
  };
}

function buildSignals(persona, issueId, issue, dialogue) {
  const session = getActiveSession(persona);
  const hired = listOnDemandForIssue(issueId);

  return {
    taskboardOnline: true,
    issueStatus: issue?.status ?? "unknown",
    issueVersion: issue?.version ?? null,
    blocked: issue?.status === "blocked",
    sessionActive: Boolean(session?.issueId === issueId),
    handoffReceived: dialogue.handoffReceived,
    verdictPosted: dialogue.verdictPosted,
    g1Pass: dialogue.g1Pass,
    g1ChangesRequired: dialogue.g1Changes,
    oraclesPass: false,
    allGatesPass: false,
    blockedCycles: 0,
    hiredWorkers: hired.map((h) => h.slug),
    lastDialogueAgeMs: dialogue.lastFromPersonaAt
      ? Date.now() - new Date(dialogue.lastFromPersonaAt).getTime()
      : null,
  };
}

function syncStateFromSignals(persona, issueId, signals, dialogue, g0 = {}) {
  const current = loadWorkflowState(persona, issueId);
  const checklist = {
    ...current.checklist,
    agentsMdRead: g0.agentsMdRead ?? current.checklist.agentsMdRead,
    taskboardEnsure: g0.taskboardEnsure ?? current.checklist.taskboardEnsure,
    scopeAcknowledged: g0.scopeAcknowledged ?? current.checklist.scopeAcknowledged,
    sessionStarted: signals.sessionActive,
    ackPosted: dialogue.hasAck,
    lastDialogueAt: dialogue.lastFromPersonaAt ?? dialogue.lastAt,
    lastStatusAt: dialogue.hasStatus ? dialogue.lastAt : null,
    lastTaskboardCommentAt:
      g0.lastTaskboardCommentAt ?? current.checklist.lastTaskboardCommentAt,
  };
  const step = stepAfterG0Complete(current.step, checklist);

  return saveWorkflowState(persona, issueId, {
    step,
    checklist,
    hiredWorkers: signals.hiredWorkers,
    blockers: signals.blocked ? ["issue-blocked-on-taskboard"] : [],
  });
}

function buildG0Signals(online, issueId) {
  return {
    agentsMdRead: agentsMdExists(),
    taskboardEnsure: online,
    lastTaskboardCommentAt: online ? fetchLatestTaskboardCommentAt(issueId) : null,
  };
}

function staleWarnings(state, signals, dialogue) {
  const warnings = [];
  if (signals.lastDialogueAgeMs != null && signals.lastDialogueAgeMs > SILENCE_THRESHOLD_MS) {
    warnings.push({
      code: "SILENCE",
      message: `Sem dialogue há ${Math.round(signals.lastDialogueAgeMs / 60000)}min (>10min)`,
    });
  }
  if (state.level === "C" && signals.issueStatus === "in_progress" && !dialogue.hasAck) {
    warnings.push({ code: "MISSING_ACK", message: "Issue in_progress sem ack no dialogue" });
  }
  if (state.level === "C" && signals.issueStatus === "in_progress" && !signals.sessionActive) {
    warnings.push({ code: "NO_SESSION", message: "Sessão orchestration:session não ativa" });
  }
  if (state.level === "C" && signals.issueStatus === "in_progress" && !dialogue.hasStatus) {
    warnings.push({ code: "MISSING_STATUS", message: "Nenhum status postado nesta issue" });
  }
  return warnings;
}

async function cmdStatus(persona, issueId, json) {
  getPersona(persona);
  const online = await taskboardOnline();
  const issue = online ? await fetchIssue(issueId) : null;
  const dialogue = dialogueForIssue(issueId, persona);
  const signals = buildSignals(persona, issueId, issue, dialogue);
  signals.taskboardOnline = online;
  const g0 = buildG0Signals(online, issueId);
  const state = syncStateFromSignals(persona, issueId, signals, dialogue, g0);
  const warnings = staleWarnings(state, signals, dialogue);
  const next = suggestNextAction(persona, issueId, signals);

  const report = {
    persona,
    issueId,
    taskboardOnline: online,
    issue: issue ? { status: issue.status, title: issue.title, version: issue.version } : null,
    workflowState: state,
    dialogue: {
      messageCount: dialogue.total,
      types: dialogue.types,
      hasAck: dialogue.hasAck,
      hasStatus: dialogue.hasStatus,
      hasHandoff: dialogue.hasHandoff,
      hasVerdict: dialogue.hasVerdict,
    },
    hiredWorkers: signals.hiredWorkers,
    warnings,
    suggestedNext: next,
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  console.log(`Workflow: ${persona} · ${issueId}`);
  console.log(`Gate: ${state.gate} · Step: ${state.step}`);
  console.log(`Taskboard: ${online ? "online" : "OFFLINE"} · Issue: ${issue?.status ?? "?"}`);
  console.log(
    `Dialogue: ack=${dialogue.hasAck} status=${dialogue.hasStatus} handoff=${dialogue.hasHandoff} verdict=${dialogue.hasVerdict}`,
  );
  if (warnings.length) {
    console.log("Warnings:");
    for (const w of warnings) console.log(`  - [${w.code}] ${w.message}`);
  }
  console.log(`Next: ${next.action} — ${next.reason}`);
  if (next.command) console.log(`  cmd: ${next.command}`);
  return report;
}

async function cmdNext(persona, issueId, json) {
  const online = await taskboardOnline();
  const issue = online ? await fetchIssue(issueId) : null;
  const dialogue = dialogueForIssue(issueId, persona);
  const signals = buildSignals(persona, issueId, issue, dialogue);
  signals.taskboardOnline = online;
  const next = suggestNextAction(persona, issueId, signals);
  saveWorkflowState(persona, issueId, { step: next.step });

  if (json) {
    console.log(JSON.stringify({ persona, issueId, next }, null, 2));
    return next;
  }
  console.log(`${next.action}: ${next.reason}`);
  if (next.command) console.log(next.command);
  if (next.dialogueType) console.log(`dialogue type: ${next.dialogueType}`);
  if (next.handoffTo) console.log(`handoff → ${next.handoffTo}`);
  return next;
}

async function cmdMonitor(levelFilter, json) {
  const online = await taskboardOnline();
  const personas = levelFilter === "C" ? LEVEL_C : null;
  let states = loadAllWorkflowStates(levelFilter ?? null);

  if (states.length === 0 && personas) {
    for (const persona of personas) {
      const session = getActiveSession(persona);
      if (session?.issueId) {
        states.push(loadWorkflowState(persona, session.issueId));
      }
    }
  }

  const results = [];
  for (const state of states) {
    const { persona, issueId } = state;
    const issue = online ? await fetchIssue(issueId) : null;
    const dialogue = dialogueForIssue(issueId, persona);
    const signals = buildSignals(persona, issueId, issue, dialogue);
    signals.taskboardOnline = online;
    const g0 = buildG0Signals(online, issueId);
    syncStateFromSignals(persona, issueId, signals, dialogue, g0);
    const warnings = staleWarnings(state, signals, dialogue);
    const next = suggestNextAction(persona, issueId, signals);
    results.push({ persona, issueId, issueStatus: issue?.status, warnings, next });
  }

  if (json) {
    console.log(JSON.stringify({ taskboardOnline: online, level: levelFilter, agents: results }, null, 2));
    return results;
  }

  console.log(`Level ${levelFilter ?? "ALL"} monitor · taskboard ${online ? "online" : "OFFLINE"}`);
  console.log(`Workflow dir: ${workflowsDir} · ${states.length} state(s)`);
  for (const r of results) {
    console.log(`\n${r.persona} · ${r.issueId} · ${r.issueStatus ?? "?"}`);
    for (const w of r.warnings) console.log(`  ⚠ [${w.code}] ${w.message}`);
    console.log(`  → ${r.next.action}: ${r.next.reason}`);
  }
  if (results.length === 0) {
    console.log("\nNenhum estado workflow. Use sync ou inicie sessão Level C.");
  }
  return results;
}

async function cmdSync(persona, issueId, json) {
  return cmdStatus(persona, issueId, json);
}

function usage() {
  console.log(`Usage:
  npm run orchestration:workflow -- status --persona SLUG --issue ANX-N [--json]
  npm run orchestration:workflow -- next --persona SLUG --issue ANX-N [--json]
  npm run orchestration:workflow -- monitor [--level C] [--json]
  npm run orchestration:workflow -- sync --persona SLUG --issue ANX-N [--json]`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.cmd || args.cmd === "help" || args.cmd === "--help") {
    usage();
    process.exit(0);
  }

  try {
    switch (args.cmd) {
      case "status":
        if (!args.persona || !args.issue) throw new Error("status requires --persona and --issue");
        await cmdStatus(args.persona, args.issue, args.json);
        break;
      case "next":
        if (!args.persona || !args.issue) throw new Error("next requires --persona and --issue");
        await cmdNext(args.persona, args.issue, args.json);
        break;
      case "monitor":
        await cmdMonitor(args.level, args.json);
        break;
      case "sync":
        if (!args.persona || !args.issue) throw new Error("sync requires --persona and --issue");
        await cmdSync(args.persona, args.issue, args.json);
        break;
      default:
        throw new Error(`Comando desconhecido: ${args.cmd}`);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

export { cmdStatus, cmdNext, cmdMonitor, buildSignals, dialogueForIssue, staleWarnings };
