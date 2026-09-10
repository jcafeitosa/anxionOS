/**
 * Dual taskboard routing — Dashi (project) vs Cursor goals (framework/non-project).
 *
 * @see .cursor/orchestration/TASKBOARD-ROUTING.md
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getOrchestrationPaths } from "./load-config.mjs";

export const SCOPES = ["project", "framework", "auto"];
export const BOARD_TYPES = ["dashi", "cursor"];

const DEFAULT_ROUTING = {
  project: "dashi",
  nonProject: "cursor",
  frameworkPathPrefixes: [
    ".cursor/orchestration/",
    ".cursor/rules/",
    ".cursor/hooks/",
    ".cursor/hooks.json",
    ".cursor/skills/",
    ".cursor/commands/",
    ".cursor/orchestration.config.json",
    ".cursor/orchestration-runtime/",
    ".codewhale/",
  ],
  projectPathPrefixes: ["backend/", "frontend/", "docs/", "brain/"],
  frameworkIssuePatterns: ["^ANX-23[0-9]$", "^ANX-240$", "^ANX-242$"],
  frameworkLabels: ["framework", "orchestration", "meta"],
};

function goalsDir(options = {}) {
  const paths = getOrchestrationPaths(options).paths;
  return join(paths.runtime, "goals");
}

export function goalsRegistryPath(options = {}) {
  return join(goalsDir(options), "registry.json");
}

function emptyGoalsRegistry() {
  return { version: 1, updatedAt: new Date().toISOString(), goals: [] };
}

export function ensureGoalsDir(options = {}) {
  const dir = goalsDir(options);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function loadGoalsRegistry(options = {}) {
  ensureGoalsDir(options);
  const path = goalsRegistryPath(options);
  if (!existsSync(path)) return emptyGoalsRegistry();
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return {
      version: 1,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      goals: Array.isArray(data.goals) ? data.goals : [],
    };
  } catch {
    return emptyGoalsRegistry();
  }
}

export function saveGoalsRegistry(registry, options = {}) {
  ensureGoalsDir(options);
  const path = goalsRegistryPath(options);
  registry.updatedAt = new Date().toISOString();
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function getRoutingConfig(options = {}) {
  const { config } = getOrchestrationPaths(options);
  const raw = config.taskboardRouting ?? {};
  return {
    ...DEFAULT_ROUTING,
    ...raw,
    frameworkPathPrefixes: raw.frameworkPathPrefixes ?? DEFAULT_ROUTING.frameworkPathPrefixes,
    projectPathPrefixes: raw.projectPathPrefixes ?? DEFAULT_ROUTING.projectPathPrefixes,
    frameworkIssuePatterns: raw.frameworkIssuePatterns ?? DEFAULT_ROUTING.frameworkIssuePatterns,
    frameworkLabels: raw.frameworkLabels ?? DEFAULT_ROUTING.frameworkLabels,
  };
}

export function normalizePathForRouting(filePath) {
  return String(filePath ?? "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

export function pathMatchesPrefix(normalizedPath, prefix) {
  const p = normalizePathForRouting(prefix).replace(/\/$/, "");
  const f = normalizePathForRouting(normalizedPath);
  return f === p || f.startsWith(`${p}/`);
}

export function isFrameworkPath(filePath, options = {}) {
  const routing = getRoutingConfig(options);
  const normalized = normalizePathForRouting(filePath);
  return routing.frameworkPathPrefixes.some((prefix) => pathMatchesPrefix(normalized, prefix));
}

export function isProjectPath(filePath, options = {}) {
  const routing = getRoutingConfig(options);
  const normalized = normalizePathForRouting(filePath);
  return routing.projectPathPrefixes.some((prefix) => pathMatchesPrefix(normalized, prefix));
}

export function issueMatchesFrameworkPatterns(issueId, options = {}) {
  if (!issueId) return false;
  const routing = getRoutingConfig(options);
  const normalized = String(issueId).toUpperCase();
  return routing.frameworkIssuePatterns.some((pattern) => {
    try {
      return new RegExp(pattern, "i").test(normalized);
    } catch {
      return false;
    }
  });
}

export function inferScopeFromPaths(changedPaths = [], options = {}) {
  const paths = (changedPaths ?? []).map(normalizePathForRouting).filter(Boolean);
  if (paths.length === 0) return { scope: null, reason: "no paths" };

  let hasFramework = false;
  let hasProject = false;
  for (const p of paths) {
    if (isFrameworkPath(p, options)) hasFramework = true;
    if (isProjectPath(p, options)) hasProject = true;
  }

  if (hasProject && hasFramework) {
    return {
      scope: null,
      reason: "mixed project and framework paths — split work or pick explicit --scope",
      mixed: true,
      paths,
    };
  }
  if (hasProject) return { scope: "project", reason: "project path prefix", paths };
  if (hasFramework) return { scope: "framework", reason: "framework path prefix", paths };
  return { scope: "project", reason: "default project (unclassified paths)", paths };
}

export function inferScopeFromIssue(issueId, issueMeta = null, options = {}) {
  if (!issueId) return { scope: null, reason: "no issue" };

  if (issueMatchesFrameworkPatterns(issueId, options)) {
    return { scope: "framework", reason: "issue matches frameworkIssuePatterns", issueId };
  }

  const labels = issueMeta?.labels ?? [];
  const routing = getRoutingConfig(options);
  const labelHit = labels.some((label) =>
    routing.frameworkLabels.some((fl) => String(label).toLowerCase().includes(String(fl).toLowerCase())),
  );
  if (labelHit) {
    return { scope: "framework", reason: "issue label indicates framework", issueId };
  }

  const title = String(issueMeta?.title ?? "");
  if (/\bframework\b|\borquestra/i.test(title)) {
    return { scope: "framework", reason: "issue title indicates framework", issueId };
  }

  return { scope: "project", reason: "default project issue", issueId };
}

export function resolveScope({ scope = "auto", issueId = null, issue = null, changedPaths = null, options = {} } = {}) {
  if (scope === "project" || scope === "framework") {
    return { scope, reason: "explicit --scope", source: "flag" };
  }

  const paths =
    changedPaths ??
    (process.env.COMPLIANCE_CHANGED_PATHS
      ? process.env.COMPLIANCE_CHANGED_PATHS.split(",").map((s) => s.trim()).filter(Boolean)
      : null);

  if (paths?.length) {
    const fromPaths = inferScopeFromPaths(paths, options);
    if (fromPaths.scope) return { ...fromPaths, source: "paths" };
    if (fromPaths.mixed) return { scope: null, reason: fromPaths.reason, source: "paths", mixed: true };
  }

  if (issueId || issue) {
    const fromIssue = inferScopeFromIssue(issueId ?? issue?.identifier, issue, options);
    if (fromIssue.scope) return { ...fromIssue, source: "issue" };
  }

  return { scope: "project", reason: "auto default project", source: "default" };
}

export function boardTypeForScope(scope, options = {}) {
  const routing = getRoutingConfig(options);
  if (scope === "framework") return routing.nonProject === "cursor" ? "cursor" : routing.nonProject;
  return routing.project === "dashi" ? "dashi" : routing.project;
}

export function resolveTaskboardRouting(input = {}) {
  const resolved = resolveScope(input);
  const scope = resolved.scope ?? "project";
  const board = boardTypeForScope(scope, input.options);
  return {
    scope,
    board,
    boardType: board,
    reason: resolved.reason,
    source: resolved.source,
    mixed: resolved.mixed ?? false,
  };
}

export function getCursorGoalBinding(options = {}) {
  const envId = process.env.CURSOR_GOAL_ID ?? process.env.CURSOR_TASKBOARD_GOAL ?? null;
  if (envId) {
    return { goalId: envId, source: "env", active: true };
  }

  const persona = process.env.DIALOGUE_FROM_PERSONA ?? process.env.PROACTIVE_PERSONA ?? null;
  const registry = loadGoalsRegistry(options);
  const active = registry.goals.filter((g) => g.status === "active");
  if (persona) {
    const match = active.find((g) => g.persona === persona);
    if (match) return { goalId: match.id, source: "registry", active: true, goal: match };
  }
  if (active.length === 1) {
    return { goalId: active[0].id, source: "registry", active: true, goal: active[0] };
  }
  return { goalId: null, source: null, active: false };
}

export function registerCursorGoal({ id, objective, persona, issueRef = null, status = "active" }, options = {}) {
  if (!id || !objective || !persona) {
    throw new Error("registerCursorGoal requires id, objective, persona");
  }
  const registry = loadGoalsRegistry(options);
  if (registry.goals.some((g) => g.id === id)) {
    throw new Error(`Cursor goal "${id}" already exists`);
  }
  const goal = {
    id,
    objective,
    persona,
    issueRef,
    status,
    scope: "framework",
    board: "cursor",
    cursorTool: "CreateGoal",
    threadId: process.env.CURSOR_THREAD_ID ?? process.env.CODEX_THREAD_ID ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  registry.goals.push(goal);
  saveGoalsRegistry(registry, options);
  return goal;
}

export function findActiveCursorGoal(goalId, options = {}) {
  const registry = loadGoalsRegistry(options);
  return registry.goals.find((g) => g.id === goalId && g.status === "active") ?? null;
}

export function cursorGoalsEnsure(options = {}) {
  ensureGoalsDir(options);
  const binding = getCursorGoalBinding(options);
  if (binding.active) return { ok: true, binding };
  return {
    ok: false,
    binding,
    fix: "Set CURSOR_GOAL_ID or npm run orchestration:cursor-goals -- register --id ID --objective TEXT --persona SLUG",
  };
}
