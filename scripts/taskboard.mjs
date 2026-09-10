#!/usr/bin/env node
/**
 * Thin wrapper around Dashi Taskboard for anxionOS agents (Cursor + Codex).
 * Prefers `taskctl` when installed; falls back to HTTP for read-only ops.
 *
 * Usage:
 *   node scripts/taskboard.mjs ping
 *   node scripts/taskboard.mjs context
 *   node scripts/taskboard.mjs list [--status todo] [--compact]
 *   node scripts/taskboard.mjs get ANX-2
 *   node scripts/taskboard.mjs create --title "..." [--status todo] [--priority medium] [--labels for-claude,phase-1]
 *   node scripts/taskboard.mjs move ANX-2 in_progress
 *
 * Env: TASKBOARD_URL or CODEX_TASKBOARD_URL (default http://127.0.0.1:47823)
 *      TASKBOARD_PROJECT_NAME (default anxionOS)
 *      TASKBOARD_PROJECT_ID (optional pin)
 *      CURSOR_THREAD_ID (preferred) / CODEX_THREAD_ID / CLAUDE_CODE_SESSION_ID for writes
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { recordTaskboardEnsure } from "../.cursor/orchestration/agent-compliance/taskboard-cache.mjs";
import {
  detectAgentSyncDrift,
  warnAgentSyncDrift,
} from "../.cursor/orchestration/agent-config/agent-taskboard-drift.mjs";
import {
  taskboardComment,
  taskboardMove,
  warnUnsignedTaskboardWrite,
} from "../.cursor/orchestration/agent-config/agent-taskboard-write.mjs";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (
  process.env.TASKBOARD_URL ??
  process.env.CODEX_TASKBOARD_URL ??
  "http://127.0.0.1:47823"
).replace(/\/$/, "");
const projectName = process.env.TASKBOARD_PROJECT_NAME ?? "anxionOS";
const projectIdEnv = process.env.TASKBOARD_PROJECT_ID ?? null;
const threadId =
  process.env.CODEX_THREAD_ID ??
  process.env.CLAUDE_CODE_SESSION_ID ??
  process.env.CURSOR_THREAD_ID ??
  null;

const MAC_TASKCTL =
  "/Applications/Codex Taskboard.app/Contents/Resources/bin/taskctl";

/** Full-project `taskctl issue list --json` can exceed Node's default 1 MiB maxBuffer. */
const TASKCTL_MAX_BUFFER_BYTES = 16 * 1024 * 1024;

function resolveTaskctl() {
  const fromPath = spawnSync("which", ["taskctl"], { encoding: "utf8" });
  if (fromPath.status === 0 && fromPath.stdout.trim()) {
    return fromPath.stdout.trim();
  }
  if (existsSync(MAC_TASKCTL)) {
    return MAC_TASKCTL;
  }
  return null;
}

const taskctl = resolveTaskctl();

function usage(exitCode = 1) {
  console.error(`anxionOS taskboard wrapper

Commands:
  ping                         Health check (${baseUrl}/health)
  ensure                       Same as ping; fails fast if board offline (required before work)
  prework                      ensure + reminder: issue ANX-* required before any work
  context                      Resolve project for this repo (taskctl)
  projects                     List projects (HTTP)
  list [--status STATUS] [--compact]  List issues in anxionOS project
  get <ID>                     Get issue by identifier (e.g. ANX-2)
  create --title T [opts]      Create issue (requires taskctl + thread id)
  comment --issue ID --persona SLUG --body TEXT  Comentário assinado pela persona
  move <ID> <STATUS> [--persona SLUG]  Move issue (assinado se --persona)

Options for create:
  --status backlog|todo|in_progress|in_review|blocked|done|canceled
  --priority none|low|medium|high|urgent
  --labels a,b
  --description TEXT

Env: TASKBOARD_URL, TASKBOARD_PROJECT_NAME, TASKBOARD_PROJECT_ID, CURSOR_THREAD_ID, CODEX_THREAD_ID`);
  process.exit(exitCode);
}

async function httpJson(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = data?.error?.message ?? res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }
  return data;
}

function runTaskctl(args) {
  if (!taskctl) {
    throw new Error(
      "taskctl not found. Install Codex Taskboard or set PATH. Read-only HTTP still works for ping/list/get.",
    );
  }
  const env = {
    ...process.env,
    CODEX_TASKBOARD_URL: baseUrl,
  };
  const out = execFileSync(taskctl, args, {
    cwd: root,
    encoding: "utf8",
    env,
    maxBuffer: TASKCTL_MAX_BUFFER_BYTES,
  });
  return JSON.parse(out);
}

function compactTaskList(data) {
  if (!data?.tasks) return data;
  return {
    ...data,
    tasks: data.tasks.map((task) => ({
      identifier: task.identifier,
      status: task.status,
      title: task.title,
      priority: task.priority,
      labels: task.labels,
    })),
  };
}

function parsePersonaFlag(argv) {
  const idx = argv.indexOf("--persona");
  if (idx < 0) return { persona: null, rest: argv };
  const persona = argv[idx + 1];
  const rest = argv.filter((_, i) => i !== idx && i !== idx + 1);
  return { persona, rest };
}

function requireThreadId() {
  if (!threadId) {
    throw new Error(
      "Write operations need CODEX_THREAD_ID, CLAUDE_CODE_SESSION_ID, or CURSOR_THREAD_ID.",
    );
  }
  return threadId;
}

function parseCreateArgs(argv) {
  const opts = { title: null, status: "todo", priority: "medium", labels: [], description: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--title") opts.title = argv[++i];
    else if (a === "--status") opts.status = argv[++i];
    else if (a === "--priority") opts.priority = argv[++i];
    else if (a === "--labels") opts.labels = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--description") opts.description = argv[++i];
    else throw new Error(`Unknown create option: ${a}`);
  }
  if (!opts.title) throw new Error("create requires --title");
  return opts;
}

function findProjectId(projects) {
  if (projectIdEnv) {
    const pinned = projects.find((p) => p.id === projectIdEnv);
    if (pinned) return pinned.id;
    throw new Error(`TASKBOARD_PROJECT_ID="${projectIdEnv}" not found on ${baseUrl}`);
  }
  const byPath = projects.find((p) => p.workspacePath === root);
  if (byPath) return byPath.id;
  const byName = projects.find((p) => p.name === projectName);
  if (byName) return byName.id;
  throw new Error(
    `Project "${projectName}" not found. Create it in the Taskboard UI or run: taskctl project map <id> --workspace-path ${root}`,
  );
}

async function resolveProjectId() {
  if (projectIdEnv) {
    const { projects } = await httpJson("/api/projects");
    return findProjectId(projects);
  }
  if (taskctl) {
    const ctx = runTaskctl(["context", "current", "--cwd", root, "--json"]);
    if (ctx.project?.workspacePath === root || ctx.project?.name === projectName) {
      return ctx.project.id;
    }
  }
  const { projects } = await httpJson("/api/projects");
  return findProjectId(projects);
}

async function syncHireOnMove(id, status) {
  try {
    const { spawnSync } = await import('node:child_process');
    const cmd = status === 'done' ? 'done' : 'delegate';
    if (status === 'in_progress' || status === 'done') {
      spawnSync('node', ['.cursor/orchestration/agent-hire/taskboard-sync.mjs', cmd, '--issue', id], { cwd: root, encoding: 'utf8' });
    }
  } catch { /* best-effort */ }
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd) usage();

try {
  switch (cmd) {
    case "ping":
    case "ensure":
    case "prework": {
      let health;
      let online = true;
      try {
        health = await httpJson("/health");
      } catch (err) {
        online = false;
        if (cmd === "ensure" || cmd === "prework") {
          recordTaskboardEnsure(false, { url: baseUrl, error: err?.message ?? "offline" });
          console.error(`taskboard offline: ${baseUrl}`);
          process.exit(1);
        }
        throw err;
      }
      if (cmd === "ensure" || cmd === "prework") {
        recordTaskboardEnsure(true, { url: baseUrl });
      }
      if (cmd === "ensure" || cmd === "prework") {
        try {
          const drift = await detectAgentSyncDrift({ baseUrl });
          warnAgentSyncDrift(drift);
        } catch {
          /* best-effort drift check */
        }
      }
      const payload = { ok: true, url: baseUrl, ...health };
      if (cmd === "ensure" || cmd === "prework") {
        console.log(`taskboard online: ${baseUrl}`);
      }
      if (cmd === "prework") {
        console.log("");
        console.log("POLÍTICA zero-trabalho-fora-do-board:");
        console.log("  1. Issue ANX-* obrigatória (criar ou claim in_progress antes de codar/commitar/docs)");
        console.log("  2. npm run taskboard:context && npm run taskboard:list");
        console.log("  3. Board offline = PARAR (não improvisar)");
        console.log("  4. Ao terminar: comentário → in_review");
        console.log("");
        console.log(JSON.stringify({ ...payload, policy: "zero-trabalho-fora-do-board", issueRequired: true }, null, 2));
        break;
      }
      console.log(JSON.stringify(payload, null, 2));
      break;
    }
    case "context": {
      if (!taskctl) {
        const { projects } = await httpJson("/api/projects");
        const project = projects.find((p) => p.name === projectName);
        console.log(
          JSON.stringify(
            { cwd: root, project, taskctl: false, hint: "Install taskctl for workspace mapping" },
            null,
            2,
          ),
        );
        break;
      }
      console.log(JSON.stringify(runTaskctl(["context", "current", "--cwd", root, "--json"]), null, 2));
      break;
    }
    case "projects": {
      const data = await httpJson("/api/projects");
      console.log(JSON.stringify(data, null, 2));
      break;
    }
    case "list": {
      const statusIdx = rest.indexOf("--status");
      const status = statusIdx >= 0 ? rest[statusIdx + 1] : undefined;
      const compact = rest.includes("--compact");
      if (taskctl) {
        const projectId = await resolveProjectId();
        const args = ["issue", "list", "--project", projectId, "--json"];
        if (status) args.push("--status", status);
        const data = compact ? compactTaskList(runTaskctl(args)) : runTaskctl(args);
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      const projectId = await resolveProjectId();
      const query = status ? `?projectId=${projectId}&status=${status}` : `?projectId=${projectId}`;
      const data = compact
        ? compactTaskList(await httpJson(`/api/tasks${query}`))
        : await httpJson(`/api/tasks${query}`);
      console.log(JSON.stringify(data, null, 2));
      break;
    }
    case "get": {
      const id = rest[0];
      if (!id) throw new Error("get requires issue ID (e.g. ANX-2)");
      if (taskctl) {
        console.log(JSON.stringify(runTaskctl(["issue", "get", id, "--json"]), null, 2));
        break;
      }
      const { tasks } = await httpJson("/api/tasks");
      const task = tasks.find((t) => t.identifier === id || t.id === id);
      if (!task) throw new Error(`Issue not found: ${id}`);
      console.log(JSON.stringify({ task }, null, 2));
      break;
    }
    case "create": {
      const opts = parseCreateArgs(rest);
      const tid = requireThreadId();
      const projectId = await resolveProjectId();
      const args = [
        "issue",
        "create",
        "--project",
        projectId,
        "--title",
        opts.title,
        "--status",
        opts.status,
        "--priority",
        opts.priority,
        "--thread-id",
        tid,
        "--json",
      ];
      if (opts.labels.length) args.push("--labels", opts.labels.join(","));
      if (opts.description) args.push("--description", opts.description);
      console.log(JSON.stringify(runTaskctl(args), null, 2));
      break;
    }
    case "comment": {
      let issueId = null;
      let persona = null;
      let body = null;
      for (let i = 0; i < rest.length; i += 1) {
        const a = rest[i];
        if (a === "--issue") issueId = rest[++i]?.toUpperCase();
        else if (a === "--persona") persona = rest[++i];
        else if (a === "--body") body = rest[++i];
        else throw new Error(`Unknown comment option: ${a}`);
      }
      if (!issueId || !persona || !body) {
        throw new Error("comment requires --issue ANX-N --persona SLUG --body TEXT");
      }
      const result = await taskboardComment({ issueId, persona, body });
      if (!result.ok) throw new Error(result.error ?? "comment failed");
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "move": {
      const { persona, rest: moveRest } = parsePersonaFlag(rest);
      const [id, status] = moveRest;
      if (!id || !status) throw new Error("move requires <ID> <STATUS>");
      await syncHireOnMove(id, status);
      if (persona) {
        const result = await taskboardMove({ issueId: id, status, persona });
        if (!result.ok) throw new Error(result.error ?? "move failed");
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      warnUnsignedTaskboardWrite("move", `${id} → ${status}`);
      const tid = requireThreadId();
      const current = runTaskctl(["issue", "get", id, "--json"]);
      const version = current.task?.version ?? current.version;
      if (!version) throw new Error(`Could not read version for ${id}`);
      console.log(
        JSON.stringify(
          runTaskctl([
            "issue",
            "move",
            id,
            "--status",
            status,
            "--if-version",
            String(version),
            "--thread-id",
            tid,
            "--json",
          ]),
          null,
          2,
        ),
      );
      break;
    }
    default:
      usage();
  }
} catch (err) {
  console.error(err.message ?? err);
  process.exit(1);
}
