#!/usr/bin/env node
/**
 * Thin wrapper around Dashi/Codex Taskboard for anxionOS agents.
 * Prefers `taskctl` when installed; falls back to HTTP for read-only ops.
 *
 * Usage:
 *   node scripts/taskboard.mjs ping
 *   node scripts/taskboard.mjs context
 *   node scripts/taskboard.mjs list [--status todo]
 *   node scripts/taskboard.mjs get ANX-2
 *   node scripts/taskboard.mjs create --title "..." [--status todo] [--priority medium] [--labels for-claude,phase-1]
 *   node scripts/taskboard.mjs move ANX-2 in_progress
 *
 * Env: TASKBOARD_URL or CODEX_TASKBOARD_URL (default http://127.0.0.1:47823)
 *      TASKBOARD_PROJECT_NAME (default anxionOS)
 *      CODEX_THREAD_ID / CLAUDE_CODE_SESSION_ID for write attribution
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (
  process.env.TASKBOARD_URL ??
  process.env.CODEX_TASKBOARD_URL ??
  "http://127.0.0.1:47823"
).replace(/\/$/, "");
const projectName = process.env.TASKBOARD_PROJECT_NAME ?? "anxionOS";
const threadId =
  process.env.CODEX_THREAD_ID ??
  process.env.CLAUDE_CODE_SESSION_ID ??
  process.env.CURSOR_THREAD_ID ??
  null;

const MAC_TASKCTL =
  "/Applications/Codex Taskboard.app/Contents/Resources/bin/taskctl";

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
  context                      Resolve project for this repo (taskctl)
  projects                     List projects (HTTP)
  list [--status STATUS]       List issues in anxionOS project
  get <ID>                     Get issue by identifier (e.g. ANX-2)
  create --title T [opts]      Create issue (requires taskctl + thread id)
  move <ID> <STATUS>           Move issue status (requires taskctl + thread id)

Options for create:
  --status backlog|todo|in_progress|in_review|blocked|done|canceled
  --priority none|low|medium|high|urgent
  --labels a,b
  --description TEXT

Env: TASKBOARD_URL, TASKBOARD_PROJECT_NAME, CODEX_THREAD_ID`);
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
  });
  return JSON.parse(out);
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
  const byName = projects.find((p) => p.name === projectName);
  if (byName) return byName.id;
  throw new Error(
    `Project "${projectName}" not found. Create it in the Taskboard UI or run: taskctl project create --name ${projectName}`,
  );
}

async function resolveProjectId() {
  if (taskctl) {
    const ctx = runTaskctl(["context", "current", "--cwd", root, "--json"]);
    if (ctx.project?.name === projectName || ctx.project?.workspacePath === root) {
      return ctx.project.id;
    }
  }
  const { projects } = await httpJson("/api/projects");
  return findProjectId(projects);
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd) usage();

try {
  switch (cmd) {
    case "ping": {
      const health = await httpJson("/health");
      console.log(JSON.stringify({ ok: true, url: baseUrl, ...health }, null, 2));
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
      if (taskctl) {
        const projectId = await resolveProjectId();
        const args = ["issue", "list", "--project", projectId, "--json"];
        if (status) args.push("--status", status);
        console.log(JSON.stringify(runTaskctl(args), null, 2));
        break;
      }
      const projectId = await resolveProjectId();
      const query = status ? `?projectId=${projectId}&status=${status}` : `?projectId=${projectId}`;
      const data = await httpJson(`/api/tasks${query}`);
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
    case "move": {
      const [id, status] = rest;
      if (!id || !status) throw new Error("move requires <ID> <STATUS>");
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
