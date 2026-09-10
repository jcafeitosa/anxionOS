/**
 * Coordenação multi-chat — um claim ativo por issue por projeto.
 * Registry: .cursor/orchestration-runtime/autonomy/issue-locks.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getOrchestrationPaths } from "../agent-config/load-config.mjs";
import { SILENCE_THRESHOLD_MS } from "./state.mjs";

export const LOCK_STALE_MS = SILENCE_THRESHOLD_MS * 3;

const locksFileName = "issue-locks.json";

function autonomyDir() {
  return getOrchestrationPaths().paths.autonomy;
}

function locksPath() {
  return join(autonomyDir(), locksFileName);
}

export function resolveThreadId() {
  return (
    process.env.CURSOR_THREAD_ID ??
    process.env.CODEX_THREAD_ID ??
    process.env.CLAUDE_CODE_SESSION_ID ??
    null
  );
}

function ensureAutonomyDir() {
  const dir = autonomyDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function emptyStore() {
  return { version: 1, updatedAt: new Date().toISOString(), locks: {} };
}

export function loadIssueLocks() {
  ensureAutonomyDir();
  const path = locksPath();
  if (!existsSync(path)) return emptyStore();
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return {
      version: 1,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      locks: data.locks ?? {},
    };
  } catch {
    return emptyStore();
  }
}

export function saveIssueLocks(store) {
  ensureAutonomyDir();
  store.updatedAt = new Date().toISOString();
  writeFileSync(locksPath(), `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function sessionThreadKey(session) {
  if (session.threadId) return session.threadId;
  return `unknown:${session.persona}`;
}

function readActiveSessionsStore() {
  ensureAutonomyDir();
  const path = join(autonomyDir(), "active-sessions.json");
  if (!existsSync(path)) return { sessions: {} };
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return { sessions: data.sessions ?? {} };
  } catch {
    return { sessions: {} };
  }
}

export function groupSessionsByIssue(issueId = null, sessionsStore = null) {
  const store = sessionsStore ?? readActiveSessionsStore();
  const byIssue = {};

  for (const session of Object.values(store.sessions)) {
    if (!session.issueId) continue;
    if (issueId && session.issueId !== issueId) continue;

    const entry = byIssue[session.issueId] ?? {};
    const key = sessionThreadKey(session);
    entry[key] = entry[key] ?? {
      threadId: session.threadId ?? null,
      threadKey: key,
      personas: [],
      lastActivityAt: session.lastActivityAt ?? session.startedAt,
      startedAt: session.startedAt,
    };
    entry[key].personas.push(session.persona);
    const activity = session.lastActivityAt ?? session.startedAt;
    if (activity && Date.parse(activity) > Date.parse(entry[key].lastActivityAt ?? 0)) {
      entry[key].lastActivityAt = activity;
    }
    byIssue[session.issueId] = entry;
  }

  return byIssue;
}

function isLockStale(lock, now = Date.now()) {
  const ref = lock.lastHeartbeatAt ?? lock.claimedAt;
  if (!ref) return true;
  return now - Date.parse(ref) >= LOCK_STALE_MS;
}

export function findCrossChatConflicts(issueId, currentThreadId = resolveThreadId()) {
  const groups = groupSessionsByIssue(issueId)[issueId] ?? {};
  const threadKeys = Object.keys(groups);
  const currentKey = currentThreadId ?? `unknown:${process.env.DIALOGUE_FROM_PERSONA ?? "anonymous"}`;

  const holders = threadKeys
    .filter((key) => key !== currentKey)
    .map((key) => groups[key]);

  const store = loadIssueLocks();
  const explicit = store.locks[issueId];
  const explicitConflict =
    explicit &&
    !isLockStale(explicit) &&
    explicit.threadId &&
    currentThreadId &&
    explicit.threadId !== currentThreadId;

  const sessionConflict = holders.some((h) => {
    const age = Date.now() - Date.parse(h.lastActivityAt ?? h.startedAt ?? 0);
    return age < LOCK_STALE_MS;
  });

  if (!explicitConflict && !sessionConflict) {
    return { conflict: false, issueId, currentThreadId, holders: [], explicitLock: explicit ?? null };
  }

  return {
    conflict: true,
    issueId,
    currentThreadId,
    holders: holders.filter((h) => {
      const age = Date.now() - Date.parse(h.lastActivityAt ?? h.startedAt ?? 0);
      return age < LOCK_STALE_MS;
    }),
    explicitLock: explicitConflict ? explicit : null,
    staleExplicit: explicit && isLockStale(explicit) ? explicit : null,
  };
}

export function acquireIssueLock(issueId, persona, opts = {}) {
  const threadId = opts.threadId ?? resolveThreadId();
  const store = loadIssueLocks();
  const existing = store.locks[issueId];
  const now = new Date().toISOString();

  if (existing && !isLockStale(existing) && existing.threadId && threadId && existing.threadId !== threadId) {
    return { ok: false, conflict: findCrossChatConflicts(issueId, threadId), lock: existing };
  }

  const personas = new Set(existing?.personas ?? []);
  if (persona) personas.add(persona);

  store.locks[issueId] = {
    issueId,
    threadId,
    persona: existing?.persona ?? persona ?? null,
    personas: [...personas],
    claimedAt: existing?.claimedAt ?? now,
    lastHeartbeatAt: now,
  };
  saveIssueLocks(store);
  return { ok: true, lock: store.locks[issueId] };
}

export function heartbeatIssueLock(issueId, threadId = resolveThreadId()) {
  const store = loadIssueLocks();
  const lock = store.locks[issueId];
  if (!lock) return null;
  if (threadId && lock.threadId && lock.threadId !== threadId) return null;
  lock.lastHeartbeatAt = new Date().toISOString();
  saveIssueLocks(store);
  return lock;
}

export function releaseIssueLock(issueId, threadId = resolveThreadId(), opts = {}) {
  const store = loadIssueLocks();
  const lock = store.locks[issueId];
  if (!lock) return { released: false, reason: "no_lock" };

  const sessionsOnIssue = groupSessionsByIssue(issueId)[issueId] ?? {};
  const activeFromThread = threadId
    ? Object.values(sessionsOnIssue).some((g) => g.threadId === threadId)
    : false;

  if (activeFromThread && !opts.force) {
    return { released: false, reason: "sessions_still_active" };
  }

  if (threadId && lock.threadId && lock.threadId !== threadId && !opts.force) {
    return { released: false, reason: "held_by_other_thread", lock };
  }

  delete store.locks[issueId];
  saveIssueLocks(store);
  return { released: true, lock };
}

export function getCoordinationStatus(issueId = null) {
  const locks = loadIssueLocks();
  const sessions = groupSessionsByIssue(issueId);
  const issues = issueId ? [issueId] : [...new Set([...Object.keys(locks.locks), ...Object.keys(sessions)])];

  return issues.sort().map((id) => {
    const conflict = findCrossChatConflicts(id);
    return {
      issueId: id,
      lock: locks.locks[id] ?? null,
      lockStale: locks.locks[id] ? isLockStale(locks.locks[id]) : null,
      sessionThreads: sessions[id] ?? {},
      conflict: conflict.conflict,
      holders: conflict.holders,
    };
  });
}

/**
 * Violação bloqueante quando outro chat/thread mantém claim ativo na mesma issue.
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateCrossChatClaimConflicts(persona, issueId, session = null) {
  const violations = [];
  if (!issueId) return violations;

  const threadId = session?.threadId ?? resolveThreadId();
  const result = findCrossChatConflicts(issueId, threadId);
  if (!result.conflict) return violations;

  const holderSummary = result.holders
    .map((h) => `${h.threadId ?? h.threadKey} (${h.personas.join(", ")})`)
    .join("; ");
  const explicit = result.explicitLock
    ? ` lock=${result.explicitLock.threadId}`
    : "";

  violations.push({
    code: "CROSS_CHAT_CLAIM_CONFLICT",
    message:
      `Issue ${issueId} com claim ativo em outro chat/thread${explicit}` +
      (holderSummary ? ` — ${holderSummary}` : ""),
    fix:
      `npm run orchestration:coordination -- status --issue ${issueId}; ` +
      `coordenar handoff ou encerrar sessão alheia antes de claimar`,
  });

  return violations;
}

/**
 * Z21 — lock explícito obrigatório: a thread atual deve segurar issue-locks.json
 * antes de editar código/docs (complementa move in_progress + CROSS_CHAT_CLAIM_CONFLICT).
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateIssueLockHeld(issueId, session = null) {
  const violations = [];
  if (!issueId) return violations;

  const threadId = session?.threadId ?? resolveThreadId();
  if (!threadId) {
    violations.push({
      code: "MISSING_ISSUE_LOCK",
      message: `Issue ${issueId} sem CURSOR_THREAD_ID — impossível bloquear task para esta conversa`,
      fix:
        `export CURSOR_THREAD_ID="cursor-<thread>"; ` +
        `npm run orchestration:coordination -- claim-check --issue ${issueId} --persona SLUG --acquire`,
    });
    return violations;
  }

  const store = loadIssueLocks();
  const lock = store.locks[issueId];

  if (!lock || isLockStale(lock)) {
    violations.push({
      code: "MISSING_ISSUE_LOCK",
      message: `Issue ${issueId} sem lock ativo — bloqueie a task antes de codar (Z21)`,
      fix:
        `npm run orchestration:coordination -- claim-check --issue ${issueId} --persona SLUG --acquire; ` +
        `node scripts/taskboard.mjs comment --issue ${issueId} --persona SLUG --body "CLAIM + LOCK"`,
    });
    return violations;
  }

  if (lock.threadId !== threadId) {
    violations.push({
      code: "MISSING_ISSUE_LOCK",
      message: `Lock de ${issueId} pertence a outra thread (${lock.threadId}) — esta thread não pode trabalhar`,
      fix: `npm run orchestration:coordination -- status --issue ${issueId}; handoff ou release antes de claimar`,
    });
  }

  return violations;
}

