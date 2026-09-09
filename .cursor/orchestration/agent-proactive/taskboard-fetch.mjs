/**
 * Leitura read-only do taskboard para triggers proativos.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getOrchestrationPaths, getTaskboardProject } from "../agent-config/load-config.mjs";

const paths = getOrchestrationPaths();
const root = paths.projectRoot;
const baseUrl = (
  process.env.TASKBOARD_URL ??
  process.env.CODEX_TASKBOARD_URL ??
  "http://127.0.0.1:47823"
).replace(/\/$/, "");
const projectName = process.env.TASKBOARD_PROJECT_NAME ?? getTaskboardProject() ?? paths.config.project?.name ?? null;
const MAC_TASKCTL =
  "/Applications/Codex Taskboard.app/Contents/Resources/bin/taskctl";
const TASKCTL_MAX_BUFFER_BYTES = 16 * 1024 * 1024;

function resolveTaskctl() {
  const fromPath = spawnSync("which", ["taskctl"], { encoding: "utf8" });
  if (fromPath.status === 0 && fromPath.stdout.trim()) return fromPath.stdout.trim();
  if (existsSync(MAC_TASKCTL)) return MAC_TASKCTL;
  return null;
}

const taskctl = resolveTaskctl();

async function httpJson(path) {
  const res = await fetch(`${baseUrl}${path}`, { headers: { Accept: "application/json" } });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error?.message ?? res.statusText);
  }
  return data;
}

function runTaskctl(args) {
  if (!taskctl) throw new Error("taskctl not found");
  const out = execFileSync(taskctl, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: TASKCTL_MAX_BUFFER_BYTES,
  });
  return JSON.parse(out);
}

async function resolveProjectId() {
  if (taskctl) {
    const ctx = runTaskctl(["context", "current", "--cwd", root, "--json"]);
    if (ctx.project?.id) return ctx.project.id;
  }
  const { projects } = await httpJson("/api/projects");
  const byPath = projects.find((p) => p.workspacePath === root);
  if (byPath) return byPath.id;
  const byName = projects.find((p) => p.name === projectName);
  if (!byName) throw new Error(`Project "${projectName ?? "(unset)"}" not found — configure taskboardProject in orchestration.config.json`);
  return byName.id;
}

/**
 * @returns {Promise<{ online: boolean, tasks: Object[], error?: string }>}
 */
export async function fetchBoardState() {
  try {
    await httpJson("/health");
  } catch (err) {
    return { online: false, tasks: [], error: err.message };
  }

  try {
    if (taskctl) {
      const projectId = await resolveProjectId();
      const data = runTaskctl(["issue", "list", "--project", projectId, "--json"]);
      return { online: true, tasks: data.tasks ?? [] };
    }
    const projectId = await resolveProjectId();
    const data = await httpJson(`/api/tasks?projectId=${projectId}`);
    return { online: true, tasks: data.tasks ?? [] };
  } catch (err) {
    return { online: false, tasks: [], error: err.message };
  }
}

/**
 * @param {Object} task
 */
export function isUnblocked(task) {
  const blockers = task.relations?.blockedBy ?? [];
  if (blockers.length === 0) return true;
  return blockers.every((b) => b.status === "done" || b.status === "canceled");
}

/**
 * @param {string} iso
 */
export function hoursSince(iso) {
  if (!iso) return 0;
  return (Date.now() - Date.parse(iso)) / (1000 * 60 * 60);
}
