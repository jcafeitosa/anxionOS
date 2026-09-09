#!/usr/bin/env node
/**
 * Rastreamento de sessões ativas — política No Silent Work.
 *
 * Usage:
 *   node session-tracker.mjs start --persona SLUG --issue ANX-N
 *   node session-tracker.mjs heartbeat --persona SLUG
 *   node session-tracker.mjs end --persona SLUG [--final-message-id ID] [--force]
 *   node session-tracker.mjs list [--json]
 *   node session-tracker.mjs touch --persona SLUG [--message-id ID]
 *
 * Estado: .cursor/orchestration-runtime/autonomy/active-sessions.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getOrchestrationPaths, repoRoot } from "../agent-config/load-config.mjs";
import { readDialogueMessages } from "./dialogue-log.mjs";
import { getPersona } from "./personas.mjs";

const autonomyDir = getOrchestrationPaths().paths.autonomy;
const sessionsPath = join(autonomyDir, "active-sessions.json");
const turnStatePath = join(autonomyDir, "turn-state.json");

const FINAL_TYPES = new Set(["handoff", "verdict"]);

function ensureAutonomyDir() {
  if (!existsSync(autonomyDir)) mkdirSync(autonomyDir, { recursive: true });
}

function emptyStore() {
  return { version: 1, updatedAt: new Date().toISOString(), sessions: {} };
}

export function loadSessions() {
  ensureAutonomyDir();
  if (!existsSync(sessionsPath)) return emptyStore();
  try {
    const data = JSON.parse(readFileSync(sessionsPath, "utf8"));
    return {
      version: 1,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      sessions: data.sessions ?? {},
    };
  } catch {
    return emptyStore();
  }
}

export function saveSessions(store) {
  ensureAutonomyDir();
  store.updatedAt = new Date().toISOString();
  writeFileSync(sessionsPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function getActiveSession(persona) {
  const store = loadSessions();
  return store.sessions[persona] ?? null;
}

function loadTurnState() {
  ensureAutonomyDir();
  if (!existsSync(turnStatePath)) return {};
  try {
    return JSON.parse(readFileSync(turnStatePath, "utf8"));
  } catch {
    return {};
  }
}

function saveTurnState(state) {
  ensureAutonomyDir();
  writeFileSync(turnStatePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function markDialogueThisTurn(persona) {
  const state = loadTurnState();
  const now = new Date().toISOString();
  state[persona] = {
    ...(state[persona] ?? {}),
    turnStartedAt: state[persona]?.turnStartedAt ?? now,
    dialogueThisTurn: true,
    updatedAt: now,
  };
  saveTurnState(state);
}

export function resetTurnState(persona) {
  const state = loadTurnState();
  state[persona] = {
    turnStartedAt: new Date().toISOString(),
    dialogueThisTurn: false,
    updatedAt: new Date().toISOString(),
  };
  saveTurnState(state);
}

export function getTurnState(persona) {
  const state = loadTurnState();
  return state[persona] ?? null;
}

function messageFromPersona(message, persona) {
  const slug = message.from?.persona?.role;
  if (slug === persona) return true;
  const agentId = message.from?.agentId ?? "";
  return agentId.startsWith(`${persona}-`);
}

function findFinalMessage(persona, issueId, sinceIso) {
  const messages = readDialogueMessages({ issueId, since: sinceIso });
  return messages.filter(
    (m) => messageFromPersona(m, persona) && FINAL_TYPES.has(m.type),
  );
}

export function startSession(persona, issueId, opts = {}) {
  const p = getPersona(persona);
  const store = loadSessions();
  const now = new Date().toISOString();
  const existing = store.sessions[persona];

  store.sessions[persona] = {
    persona,
    issueId,
    criticSlug: p.criticSlug ?? opts.criticSlug ?? null,
    threadId:
      process.env.CURSOR_THREAD_ID ??
      process.env.CODEX_THREAD_ID ??
      process.env.CLAUDE_CODE_SESSION_ID ??
      null,
    startedAt: existing?.startedAt ?? now,
    lastActivityAt: now,
    lastDialogueAt: existing?.lastDialogueAt ?? null,
    dialogueCount: existing?.dialogueCount ?? 0,
    lastMessageId: existing?.lastMessageId ?? null,
  };

  saveSessions(store);
  resetTurnState(persona);
  return store.sessions[persona];
}

export function touchSession(persona, messageId = null) {
  const store = loadSessions();
  const session = store.sessions[persona];
  if (!session) return null;

  const now = new Date().toISOString();
  session.lastActivityAt = now;
  session.lastDialogueAt = now;
  session.dialogueCount = (session.dialogueCount ?? 0) + 1;
  if (messageId) session.lastMessageId = messageId;

  saveSessions(store);
  markDialogueThisTurn(persona);
  return session;
}

export function touchSessionFromDialogue(message) {
  const persona = message.from?.persona?.role;
  if (!persona || !message.issueId) return null;

  const store = loadSessions();
  if (!store.sessions[persona]) {
    startSession(persona, message.issueId);
  }
  return touchSession(persona, message.id);
}

export function heartbeatSession(persona) {
  const store = loadSessions();
  const session = store.sessions[persona];
  if (!session) {
    throw new Error(`Nenhuma sessão ativa para persona "${persona}"`);
  }
  session.lastActivityAt = new Date().toISOString();
  saveSessions(store);
  return session;
}

export function endSession(persona, opts = {}) {
  const store = loadSessions();
  const session = store.sessions[persona];
  if (!session) {
    throw new Error(`Nenhuma sessão ativa para persona "${persona}"`);
  }

  if (!opts.force) {
    if (opts.finalMessageId) {
      const messages = readDialogueMessages({ issueId: session.issueId });
      const found = messages.find((m) => m.id === opts.finalMessageId);
      if (!found) {
        throw new Error(`Mensagem final "${opts.finalMessageId}" não encontrada`);
      }
      if (!FINAL_TYPES.has(found.type)) {
        throw new Error(
          `Mensagem final deve ser handoff ou verdict (got ${found.type})`,
        );
      }
    } else {
      const finals = findFinalMessage(persona, session.issueId, session.startedAt);
      const hasDialogue = (session.dialogueCount ?? 0) > 0 || session.lastDialogueAt;
      if (!hasDialogue) {
        throw new Error(
          "Sessão sem diálogo — publique ack/status antes de encerrar (NO-SILENT-WORK)",
        );
      }
      if (finals.length === 0) {
        console.error(
          "session-tracker: aviso — encerrando sem handoff/verdict (use --force para ignorar validação)",
        );
      }
    }
  }

  delete store.sessions[persona];
  saveSessions(store);

  const turnState = loadTurnState();
  delete turnState[persona];
  saveTurnState(turnState);

  return session;
}

export function listSilentSessions(thresholdMs = 10 * 60 * 1000) {
  const store = loadSessions();
  const now = Date.now();
  const silent = [];

  for (const session of Object.values(store.sessions)) {
    const lastDialogue = session.lastDialogueAt
      ? Date.parse(session.lastDialogueAt)
      : Date.parse(session.startedAt);
    const elapsed = now - lastDialogue;
    if (elapsed >= thresholdMs) {
      silent.push({ ...session, silentForMs: elapsed });
    }
  }

  return silent;
}

function usage(exitCode = 0) {
  console.log(`anxionOS session tracker — No Silent Work

Commands:
  start --persona SLUG --issue ANX-N
  heartbeat --persona SLUG
  end --persona SLUG [--final-message-id ID] [--force]
  touch --persona SLUG [--message-id ID]
  list [--json]

Docs: .cursor/orchestration/NO-SILENT-WORK.md`);
  process.exit(exitCode);
}

function parseOpts(argv) {
  const opts = {
    persona: null,
    issueId: null,
    finalMessageId: null,
    messageId: null,
    force: false,
    asJson: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--final-message-id") opts.finalMessageId = argv[++i];
    else if (a === "--message-id") opts.messageId = argv[++i];
    else if (a === "--force") opts.force = true;
    else if (a === "--json") opts.asJson = true;
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

function cmdStart(argv) {
  const opts = parseOpts(argv);
  if (!opts.persona || !opts.issueId) {
    throw new Error("start requer --persona e --issue");
  }
  const session = startSession(opts.persona, opts.issueId);
  console.log(`Sessão iniciada: ${opts.persona} · ${opts.issueId}`);
  if (opts.asJson) console.log(JSON.stringify(session, null, 2));
}

function cmdHeartbeat(argv) {
  const opts = parseOpts(argv);
  if (!opts.persona) throw new Error("heartbeat requer --persona");
  const session = heartbeatSession(opts.persona);
  console.log(`Heartbeat: ${opts.persona} · lastActivity=${session.lastActivityAt}`);
}

function cmdEnd(argv) {
  const opts = parseOpts(argv);
  if (!opts.persona) throw new Error("end requer --persona");
  const session = endSession(opts.persona, {
    finalMessageId: opts.finalMessageId,
    force: opts.force,
  });
  console.log(`Sessão encerrada: ${opts.persona} · ${session.issueId}`);
}

function cmdTouch(argv) {
  const opts = parseOpts(argv);
  if (!opts.persona) throw new Error("touch requer --persona");
  const session = touchSession(opts.persona, opts.messageId);
  if (!session) throw new Error(`Nenhuma sessão ativa para "${opts.persona}"`);
  console.log(`Touch: ${opts.persona} · dialogueCount=${session.dialogueCount}`);
}

function cmdList(argv) {
  const opts = parseOpts(argv);
  const store = loadSessions();
  const sessions = Object.values(store.sessions);
  if (opts.asJson) {
    console.log(JSON.stringify(sessions, null, 2));
    return;
  }
  if (sessions.length === 0) {
    console.log("(nenhuma sessão ativa)");
    return;
  }
  for (const s of sessions) {
    console.log(
      `${s.persona}\t${s.issueId}\tstarted=${s.startedAt}\tlastDialogue=${s.lastDialogueAt ?? "-"}`,
    );
  }
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "--help" || cmd === "-h") usage();

  try {
    switch (cmd) {
      case "start":
        cmdStart(rest);
        break;
      case "heartbeat":
        cmdHeartbeat(rest);
        break;
      case "end":
        cmdEnd(rest);
        break;
      case "touch":
        cmdTouch(rest);
        break;
      case "list":
        cmdList(rest);
        break;
      default:
        usage(1);
    }
  } catch (err) {
    console.error(`session-tracker error: ${err.message}`);
    process.exit(1);
  }
}
