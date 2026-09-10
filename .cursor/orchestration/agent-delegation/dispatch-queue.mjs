/**
 * Fila de dispatch executável — bridge hire/delegação → Task subagent Cursor.
 * Modelo Grok Bot: teammates nomeados, trabalho paralelo, handoff via dialogue.
 */

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getOrchestrationPaths } from "../agent-config/load-config.mjs";
import { EXECUTOR_CRITIC_PAIR, getCursorSubagentType } from "../agent-hire/levels.mjs";
import { getPersona } from "../agent-dialogue/personas.mjs";

const DISPATCH_MARKER = "CURSOR_DISPATCH_QUEUE";

export function dispatchQueuePath(projectRoot = null) {
  const paths = getOrchestrationPaths(projectRoot ? { projectRoot } : undefined).paths;
  const dir = join(dirname(paths.autonomy), "delegation");
  return join(dir, "dispatch-queue.json");
}

function ensureDir(path) {
  const dir = join(path, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function emptyQueue() {
  return { version: 1, updatedAt: new Date().toISOString(), items: [] };
}

export function loadDispatchQueue(projectRoot = null) {
  const path = dispatchQueuePath(projectRoot);
  if (!existsSync(path)) return emptyQueue();
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return {
      version: 1,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      items: data.items ?? [],
    };
  } catch {
    return emptyQueue();
  }
}

export function saveDispatchQueue(store, projectRoot = null) {
  const path = dispatchQueuePath(projectRoot);
  ensureDir(path);
  store.updatedAt = new Date().toISOString();
  writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  return store;
}

/**
 * @param {object} opts
 * @returns {object} dispatch item
 */
export function enqueueDispatch(opts) {
  const persona = opts.persona;
  const subagentType =
    opts.subagentType ?? getCursorSubagentType(persona) ?? "generalPurpose";
  const p = getPersona(persona);

  const item = {
    id: randomUUID(),
    issueId: opts.issueId,
    persona,
    personaName: p.fullName,
    subagentType,
    hiredBy: opts.hiredBy ?? "orchestrator",
    hireId: opts.hireId ?? null,
    reason: opts.reason ?? "delegação",
    evidence: opts.evidence ?? "",
    scope: opts.scope ?? "project",
    priority: opts.priority ?? 3,
    runInBackground: opts.runInBackground !== false,
    status: "pending",
    source: opts.source ?? "manual",
    createdAt: new Date().toISOString(),
    dispatchedAt: null,
    completedAt: null,
    taskAgentId: null,
    deliverables: opts.deliverables ?? null,
    constraints: opts.constraints ?? null,
  };

  const store = loadDispatchQueue(opts.projectRoot);
  const duplicate = store.items.find(
    (i) =>
      i.status === "pending" &&
      i.issueId === item.issueId &&
      i.persona === item.persona &&
      i.reason === item.reason,
  );
  if (duplicate) return duplicate;

  store.items.push(item);
  saveDispatchQueue(store, opts.projectRoot);

  const pairedCritic = EXECUTOR_CRITIC_PAIR[persona];
  if (pairedCritic && opts.enqueueCritic !== false && opts.source !== "pair") {
    enqueueDispatch({
      ...opts,
      persona: pairedCritic,
      reason: `crítico pareado de ${persona}: ${opts.reason ?? "delegação"}`,
      evidence: opts.evidence ? `pair:${persona} · ${opts.evidence}` : `pair:${persona}`,
      source: "pair",
      enqueueCritic: false,
      runInBackground: true,
    });
  }

  return item;
}

export function enqueueFromHire(hire, opts = {}) {
  return enqueueDispatch({
    issueId: hire.issueId,
    persona: hire.slug,
    subagentType: hire.cursorSubagentType ?? getCursorSubagentType(hire.slug),
    hiredBy: hire.hiredBy,
    hireId: hire.id,
    reason: hire.reason,
    evidence: hire.evidence,
    source: "hire",
    projectRoot: opts.projectRoot,
  });
}

export function listDispatches(filter = {}) {
  const store = loadDispatchQueue(filter.projectRoot);
  let items = store.items;
  if (filter.status) items = items.filter((i) => i.status === filter.status);
  if (filter.issueId) items = items.filter((i) => i.issueId === filter.issueId);
  if (filter.persona) items = items.filter((i) => i.persona === filter.persona);
  return items.sort((a, b) => a.priority - b.priority || Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export function getDispatch(id, projectRoot = null) {
  return loadDispatchQueue(projectRoot).items.find((i) => i.id === id) ?? null;
}

export function updateDispatch(id, patch, projectRoot = null) {
  const store = loadDispatchQueue(projectRoot);
  const idx = store.items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error(`Dispatch não encontrado: ${id}`);
  store.items[idx] = { ...store.items[idx], ...patch };
  saveDispatchQueue(store, projectRoot);
  return store.items[idx];
}

export function markDispatched(id, taskAgentId = null, projectRoot = null) {
  return updateDispatch(
    id,
    {
      status: "dispatched",
      dispatchedAt: new Date().toISOString(),
      taskAgentId,
    },
    projectRoot,
  );
}

export function markRunning(id, projectRoot = null) {
  return updateDispatch(id, { status: "running" }, projectRoot);
}

export function markDone(id, evidence = "", projectRoot = null) {
  return updateDispatch(
    id,
    {
      status: "done",
      completedAt: new Date().toISOString(),
      completionEvidence: evidence,
    },
    projectRoot,
  );
}

export function markFailed(id, error = "", projectRoot = null) {
  return updateDispatch(
    id,
    {
      status: "failed",
      completedAt: new Date().toISOString(),
      error,
    },
    projectRoot,
  );
}

export function getNextPending(projectRoot = null) {
  const pending = listDispatches({ status: "pending", projectRoot });
  return pending[0] ?? null;
}

export function countByStatus(projectRoot = null) {
  const items = loadDispatchQueue(projectRoot).items;
  const counts = { pending: 0, dispatched: 0, running: 0, done: 0, failed: 0 };
  for (const item of items) {
    if (counts[item.status] !== undefined) counts[item.status] += 1;
  }
  return counts;
}

export { DISPATCH_MARKER };
