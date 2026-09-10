/**
 * Escritas assinadas no Dashi Taskboard — comentários e moves atribuídos à persona.
 * Best-effort: falha graciosa quando board offline.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildActorHeaders,
  mergePersonaAgentLabel,
  prefixSignedCommentBody,
  resolveIdentity,
  resolveTaskboardClientHeader,
  resolveThreadId,
  syncAgentsToRegistry,
} from "./agent-taskboard-identity.mjs";

export const TASKBOARD_UNSIGNED_WARNING = "TASKBOARD_UNSIGNED_ACTION";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const root = join(moduleDir, "../../..");
const baseUrl = (
  process.env.TASKBOARD_URL ??
  process.env.CODEX_TASKBOARD_URL ??
  "http://127.0.0.1:47823"
).replace(/\/$/, "");
const MAC_TASKCTL = "/Applications/Codex Taskboard.app/Contents/Resources/bin/taskctl";
const TASKCTL_MAX_BUFFER = 16 * 1024 * 1024;

export function warnUnsignedTaskboardWrite(action, context = "") {
  const suffix = context ? ` (${context})` : "";
  console.warn(
    `⚠ ${TASKBOARD_UNSIGNED_WARNING}: escrita no board sem --persona${suffix} — use orchestration:taskboard ou --persona SLUG`,
  );
}

function resolveTaskctl() {
  const fromPath = spawnSync("which", ["taskctl"], { encoding: "utf8" });
  if (fromPath.status === 0 && fromPath.stdout.trim()) return fromPath.stdout.trim();
  if (existsSync(MAC_TASKCTL)) return MAC_TASKCTL;
  return null;
}

async function defaultFetchHealth() {
  const res = await fetch(`${baseUrl}/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`health ${res.status}`);
  return true;
}

async function httpJson(path, { method = "GET", body, identity, headers = {} } = {}) {
  const actorHeaders = identity ? buildActorHeaders(identity) : {
    "x-taskboard-client": resolveTaskboardClientHeader(),
    ...(resolveThreadId() ? { "x-cursor-thread-id": resolveThreadId() } : {}),
  };
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...actorHeaders,
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid JSON from ${path}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = data?.error?.message ?? res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }
  return data;
}

function runTaskctl(taskctl, args) {
  const out = execFileSync(taskctl, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CODEX_TASKBOARD_URL: baseUrl },
    maxBuffer: TASKCTL_MAX_BUFFER,
  });
  return out ? JSON.parse(out) : null;
}

export async function fetchTaskByIdentifier(issueId, deps = {}) {
  const taskctl = Object.hasOwn(deps, "taskctl") ? deps.taskctl : resolveTaskctl();
  if (taskctl) {
    const data = (deps.runTaskctl ?? runTaskctl)(taskctl, ["issue", "get", issueId, "--json"]);
    return data.task ?? data;
  }
  const { tasks } = await (deps.httpJson ?? httpJson)("/api/tasks");
  const task = tasks.find((t) => t.identifier === issueId || t.id === issueId);
  if (!task) throw new Error(`Issue not found: ${issueId}`);
  return task;
}

export async function listComments(issueId, deps = {}) {
  const taskctl = Object.hasOwn(deps, "taskctl") ? deps.taskctl : resolveTaskctl();
  if (taskctl) {
    try {
      const data = (deps.runTaskctl ?? runTaskctl)(taskctl, ["comment", "list", issueId, "--json"]);
      return data.comments ?? data ?? [];
    } catch {
      return [];
    }
  }
  const task = await fetchTaskByIdentifier(issueId, deps);
  const data = await (deps.httpJson ?? httpJson)(`/api/tasks/${task.id}/comments`);
  return data.comments ?? [];
}

/**
 * @param {Object} opts
 * @param {string} opts.issueId
 * @param {string} opts.persona
 * @param {string} opts.body
 * @param {string} [opts.threadId]
 * @param {string} [opts.idempotentMarker]
 */
export async function taskboardComment(opts, deps = {}) {
  const identity = resolveIdentity(opts.persona);
  if (!identity) {
    warnUnsignedTaskboardWrite("comment", opts.issueId);
    return { ok: false, warning: TASKBOARD_UNSIGNED_WARNING, error: "persona obrigatória" };
  }

  const fetchHealth = deps.fetchHealth ?? defaultFetchHealth;
  try {
    await fetchHealth();
  } catch (err) {
    return { ok: false, error: err.message, offline: true };
  }

  const threadId = opts.threadId ?? resolveThreadId();
  if (opts.idempotentMarker) {
    const comments = await listComments(opts.issueId, deps);
    if (comments.some((c) => String(c.body ?? "").includes(opts.idempotentMarker))) {
      return { ok: true, skipped: true, identity };
    }
  }

  try {
    const task = await fetchTaskByIdentifier(opts.issueId, deps);
    const http = deps.httpJson ?? httpJson;
    const data = await http(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      identity,
      body: {
        body: opts.skipBodyPrefix ? opts.body : prefixSignedCommentBody(identity, opts.body),
        ...(threadId ? { threadId } : {}),
      },
    });
    return {
      ok: true,
      comment: data.comment,
      identity,
      author: {
        authorType: data.comment?.authorType,
        authorId: data.comment?.authorId,
        authorName: data.comment?.authorName,
      },
    };
  } catch (err) {
    return { ok: false, error: err.message, identity };
  }
}

/**
 * @param {Object} opts
 * @param {string} opts.issueId
 * @param {string} opts.status
 * @param {string} opts.persona
 * @param {string} [opts.threadId]
 */
export async function taskboardMove(opts, deps = {}) {
  const identity = resolveIdentity(opts.persona);
  if (!identity) {
    warnUnsignedTaskboardWrite("move", `${opts.issueId} → ${opts.status}`);
    return { ok: false, warning: TASKBOARD_UNSIGNED_WARNING, error: "persona obrigatória" };
  }

  const fetchHealth = deps.fetchHealth ?? defaultFetchHealth;
  try {
    await fetchHealth();
  } catch (err) {
    return { ok: false, error: err.message, offline: true };
  }

  const resolveThread = deps.resolveThreadId ?? resolveThreadId;
  const threadId = opts.threadId ?? resolveThread();
  if (!threadId) {
    return { ok: false, error: "thread id obrigatório (CURSOR_THREAD_ID / CODEX_THREAD_ID)" };
  }

  try {
    const task = await fetchTaskByIdentifier(opts.issueId, deps);
    const version = task.version;
    if (!version) throw new Error(`version ausente em ${opts.issueId}`);
    const http = deps.httpJson ?? httpJson;
    const patchBody = {
      version,
      status: opts.status,
      threadId,
    };
    if (opts.mergeAgentLabel) {
      patchBody.labels = mergePersonaAgentLabel(task.labels, identity.slug);
    }
    const data = await http(`/api/tasks/${task.id}`, {
      method: "PATCH",
      identity,
      body: patchBody,
    });
    return { ok: true, task: data.task, identity };
  } catch (err) {
    return { ok: false, error: err.message, identity };
  }
}

/**
 * @param {Object} opts
 * @param {string} opts.issueId
 * @param {string[]} opts.labels
 * @param {string} opts.persona
 * @param {string} [opts.threadId]
 */
export async function taskboardUpdateLabels(opts, deps = {}) {
  const identity = resolveIdentity(opts.persona);
  if (!identity) {
    warnUnsignedTaskboardWrite("update-labels", opts.issueId);
    return { ok: false, warning: TASKBOARD_UNSIGNED_WARNING, error: "persona obrigatória" };
  }

  const fetchHealth = deps.fetchHealth ?? defaultFetchHealth;
  try {
    await fetchHealth();
  } catch (err) {
    return { ok: false, error: err.message, offline: true };
  }

  const threadId = opts.threadId ?? resolveThreadId();
  try {
    const task = await fetchTaskByIdentifier(opts.issueId, deps);
    const http = deps.httpJson ?? httpJson;
    const data = await http(`/api/tasks/${task.id}`, {
      method: "PATCH",
      identity,
      body: {
        version: task.version,
        labels: opts.labels,
        ...(threadId ? { threadId } : {}),
      },
    });
    return { ok: true, task: data.task, identity };
  } catch (err) {
    return { ok: false, error: err.message, identity };
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const getOpt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };

  (async () => {
    try {
      if (cmd === "comment") {
        const result = await taskboardComment({
          issueId: getOpt("--issue")?.toUpperCase(),
          persona: getOpt("--persona"),
          body: getOpt("--body"),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }
      if (cmd === "move") {
        const result = await taskboardMove({
          issueId: getOpt("--issue")?.toUpperCase(),
          status: getOpt("--status"),
          persona: getOpt("--persona"),
          mergeAgentLabel: args.includes("--merge-agent-label"),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }
      if (cmd === "sync-agents") {
        const result = await syncAgentsToRegistry();
        if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
        else console.log(`✓ ${result.agentCount} personas → ${result.path}`);
        process.exit(0);
      }
      console.log(`Usage:
  node agent-taskboard-write.mjs comment --issue ANX-N --persona SLUG --body "..."
  node agent-taskboard-write.mjs move --issue ANX-N --status STATUS --persona SLUG [--merge-agent-label]
  node agent-taskboard-write.mjs sync-agents [--json]`);
      process.exit(cmd ? 1 : 0);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  })();
}
