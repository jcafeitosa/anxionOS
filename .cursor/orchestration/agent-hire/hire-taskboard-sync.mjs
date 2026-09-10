/**
 * Sincroniza hire on-demand → Dashi Taskboard (comentário + label).
 * Best-effort: não bloqueia hire quando board offline.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPersona } from "../agent-dialogue/personas.mjs";
import { getOrchestrationPaths, getTaskboardProject } from "../agent-config/load-config.mjs";
import {
  fetchTaskByIdentifier,
  listComments,
  taskboardComment,
  taskboardUpdateLabels,
} from "../agent-config/agent-taskboard-write.mjs";
import { syncAgentToTaskboard } from "../agent-config/agent-taskboard-sync-agents.mjs";

export const HIRE_TASKBOARD_SYNC_WARNING = "HIRE_TASKBOARD_SYNC_FAILED";
export const HIRE_SYNC_MARKER_PREFIX = "HIRE_TB_SYNC:";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const root = join(moduleDir, "../../..");
const paths = getOrchestrationPaths();
const baseUrl = (
  process.env.TASKBOARD_URL ??
  process.env.CODEX_TASKBOARD_URL ??
  "http://127.0.0.1:47823"
).replace(/\/$/, "");
const projectName = process.env.TASKBOARD_PROJECT_NAME ?? getTaskboardProject() ?? paths.config.project?.name ?? "anxionOS";
const MAC_TASKCTL = "/Applications/Codex Taskboard.app/Contents/Resources/bin/taskctl";
const TASKCTL_MAX_BUFFER_BYTES = 16 * 1024 * 1024;

function resolveTaskctl() {
  const fromPath = spawnSync("which", ["taskctl"], { encoding: "utf8" });
  if (fromPath.status === 0 && fromPath.stdout.trim()) return fromPath.stdout.trim();
  if (existsSync(MAC_TASKCTL)) return MAC_TASKCTL;
  return null;
}

const defaultTaskctl = resolveTaskctl();

export function hireSyncMarker(hireId) {
  return `${HIRE_SYNC_MARKER_PREFIX}${hireId}`;
}

export function hireSyncLabel(slug) {
  return `hired:${slug}`;
}

export function buildHireSyncComment(entry, hirerPersona = null) {
  const hirer = hirerPersona ?? getPersona(entry.hiredBy);
  const subagent = entry.cursorSubagentType ? `\n- cursorSubagentType: \`${entry.cursorSubagentType}\`` : "";
  return `[hire-sync] **${entry.slug}** contratado por **${hirer.shortName}** (${entry.hiredBy}, Level ${entry.hiredByLevel})

- hire-id: \`${entry.id}\`
- tipo: ${entry.targetType}
- razão: ${entry.reason}
- evidência: ${entry.evidence}${subagent}

_ref: \`${hireSyncMarker(entry.id)}\`_`;
}

export function mergeHireLabels(existingLabels, slug) {
  const labels = [...(existingLabels ?? [])];
  const label = hireSyncLabel(slug);
  if (!labels.includes(label)) labels.push(label);
  return labels;
}

export function commentHasHireSyncMarker(comments, hireId) {
  const marker = hireSyncMarker(hireId);
  return (comments ?? []).some((c) => String(c.body ?? c.text ?? "").includes(marker));
}

export function issueHasHireLabel(issue, slug) {
  return (issue.labels ?? []).includes(hireSyncLabel(slug));
}

function resolveThreadId() {
  return (
    process.env.CURSOR_THREAD_ID ??
    process.env.CODEX_THREAD_ID ??
    process.env.CLAUDE_CODE_SESSION_ID ??
    null
  );
}

async function defaultFetchHealth() {
  const res = await fetch(`${baseUrl}/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`health ${res.status}`);
  return true;
}

function defaultRunTaskctl(taskctl, args) {
  const out = execFileSync(taskctl, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: TASKCTL_MAX_BUFFER_BYTES,
  });
  return out ? JSON.parse(out) : null;
}

/**
 * @param {Object} entry — hire entry from registerHire
 * @param {Object} [deps]
 * @returns {Promise<{ ok: boolean, skipped?: boolean, warning?: string, error?: string, commentAdded?: boolean, labelUpdated?: boolean }>}
 */
export async function syncHireToTaskboard(entry, deps = {}) {
  const fetchHealth = deps.fetchHealth ?? defaultFetchHealth;
  const taskctl = deps.taskctl ?? defaultTaskctl;
  const runTaskctl = deps.runTaskctl ?? ((ctl, args) => defaultRunTaskctl(ctl, args));
  const warn = deps.warn ?? ((msg) => console.warn(msg));
  const threadId = deps.threadId ?? resolveThreadId();

  if (!entry?.issueId || !entry?.id || !entry?.slug) {
    return { ok: false, warning: HIRE_TASKBOARD_SYNC_WARNING, error: "entry inválido" };
  }

  try {
    await fetchHealth();
  } catch (err) {
    warn(`⚠ ${HIRE_TASKBOARD_SYNC_WARNING}: taskboard offline (${err.message})`);
    return { ok: false, warning: HIRE_TASKBOARD_SYNC_WARNING, error: err.message };
  }

  const writeDeps = {
    fetchHealth,
    ...(taskctl
      ? {
          taskctl,
          runTaskctl: (ctl, args) => runTaskctl(ctl, args),
        }
      : {}),
    ...(deps.httpJson ? { httpJson: deps.httpJson } : {}),
    threadId,
  };

  try {
    const issue = await fetchTaskByIdentifier(entry.issueId, writeDeps);
    const comments = await listComments(entry.issueId, writeDeps);

    const markerExists = commentHasHireSyncMarker(comments, entry.id);
    const labelExists = issueHasHireLabel(issue, entry.slug);
    if (markerExists && labelExists) {
      return { ok: true, skipped: true, commentAdded: false, labelUpdated: false };
    }

    try {
      await syncAgentToTaskboard(entry.slug, writeDeps);
    } catch {
      /* best-effort registry */
    }

    const signerPersona = entry.hiredBy ?? "orchestrator";
    let commentAdded = false;
    if (!markerExists) {
      const body = buildHireSyncComment(entry);
      const commentResult = await taskboardComment(
        {
          issueId: entry.issueId,
          persona: signerPersona,
          body,
          threadId,
          idempotentMarker: hireSyncMarker(entry.id),
        },
        writeDeps,
      );
      if (!commentResult.ok) throw new Error(commentResult.error ?? "comment failed");
      commentAdded = !commentResult.skipped;
    }

    let labelUpdated = false;
    if (!labelExists) {
      const labels = mergeHireLabels(issue.labels, entry.slug);
      const labelResult = await taskboardUpdateLabels(
        {
          issueId: entry.issueId,
          labels,
          persona: signerPersona,
          threadId,
        },
        writeDeps,
      );
      if (!labelResult.ok) throw new Error(labelResult.error ?? "label update failed");
      labelUpdated = true;
    }

    return { ok: true, skipped: false, commentAdded, labelUpdated };
  } catch (err) {
    warn(`⚠ ${HIRE_TASKBOARD_SYNC_WARNING}: ${err.message}`);
    return { ok: false, warning: HIRE_TASKBOARD_SYNC_WARNING, error: err.message };
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const hireIdx = args.indexOf("--hire-id");
  const issueIdx = args.indexOf("--issue");
  const slugIdx = args.indexOf("--slug");
  if (hireIdx < 0 || issueIdx < 0 || slugIdx < 0) {
    console.error("Usage: hire-taskboard-sync.mjs --hire-id UUID --issue ANX-N --slug PERSONA [--json]");
    process.exit(1);
  }
  const entry = {
    id: args[hireIdx + 1],
    issueId: args[issueIdx + 1]?.toUpperCase(),
    slug: args[slugIdx + 1],
    hiredBy: args[args.indexOf("--hired-by") + 1] ?? "orchestrator",
    hiredByLevel: args[args.indexOf("--level") + 1] ?? "A",
    targetType: args[args.indexOf("--type") + 1] ?? "worker",
    reason: args[args.indexOf("--reason") + 1] ?? "manual sync",
    evidence: args[args.indexOf("--evidence") + 1] ?? "hire-taskboard-sync CLI",
  };
  syncHireToTaskboard(entry).then((result) => {
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) {
      console.log(result.skipped ? `✓ já sincronizado: ${entry.slug} · ${entry.issueId}` : `✓ sync OK: ${entry.slug} · ${entry.issueId}`);
    } else {
      console.error(`✗ sync falhou: ${result.error}`);
      process.exit(1);
    }
  });
}
