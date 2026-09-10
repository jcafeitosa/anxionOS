/**
 * Detecção de drift entre PERSONAS.md, registry local e Dashi project_agents.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PERSONA_SLUGS } from "../agent-dialogue/personas.mjs";
import { getTaskboardProject } from "./load-config.mjs";
import { readAgentRegistry } from "./agent-taskboard-identity.mjs";

export const TASKBOARD_AGENT_SYNC_DRIFT = "TASKBOARD_AGENT_SYNC_DRIFT";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const root = join(moduleDir, "../../..");
const baseUrl = (
  process.env.TASKBOARD_URL ??
  process.env.CODEX_TASKBOARD_URL ??
  "http://127.0.0.1:47823"
).replace(/\/$/, "");
const projectName = process.env.TASKBOARD_PROJECT_NAME ?? getTaskboardProject() ?? "anxionOS";

async function defaultHttpJson(path, deps = {}) {
  const res = await fetch(`${(deps.baseUrl ?? baseUrl).replace(/\/$/, "")}${path}`, {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error?.message ?? `${res.status} ${path}`);
  return data;
}

async function resolveProjectId(deps = {}) {
  if (process.env.TASKBOARD_PROJECT_ID) return process.env.TASKBOARD_PROJECT_ID;
  if (deps.projectId) return deps.projectId;
  const { projects } = await (deps.httpJson ?? defaultHttpJson)("/api/projects", deps);
  const byPath = projects.find((p) => p.workspacePath === root);
  if (byPath) return byPath.id;
  const byName = projects.find((p) => p.name === projectName);
  if (byName) return byName.id;
  throw new Error(`Projeto "${projectName}" não encontrado`);
}

export async function fetchBoardAgentIds(deps = {}) {
  await (deps.fetchHealth ??
    (async () => {
      const res = await fetch(`${(deps.baseUrl ?? baseUrl).replace(/\/$/, "")}/health`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`health ${res.status}`);
    }))();
  const projectId = await resolveProjectId(deps);
  const { agents } = await (deps.httpJson ?? defaultHttpJson)(
    `/api/projects/${encodeURIComponent(projectId)}/agents`,
    deps,
  );
  return {
    projectId,
    agentIds: (agents ?? []).map((agent) => agent.id).filter(Boolean),
  };
}

export function compareAgentSyncSets({ personaSlugs = PERSONA_SLUGS, registrySlugs = [], boardSlugs = [] } = {}) {
  const expected = [...personaSlugs].sort();
  const registry = [...registrySlugs].sort();
  const board = [...boardSlugs].sort();
  const missingFromRegistry = expected.filter((slug) => !registry.includes(slug));
  const missingFromBoard = expected.filter((slug) => !board.includes(slug));
  const extraOnBoard = board.filter((slug) => !expected.includes(slug) && slug !== "codex-agent");
  const drift = missingFromRegistry.length > 0 || missingFromBoard.length > 0;
  return {
    drift,
    warning: TASKBOARD_AGENT_SYNC_DRIFT,
    expectedCount: expected.length,
    registryCount: registry.length,
    boardCount: board.length,
    missingFromRegistry,
    missingFromBoard,
    extraOnBoard,
  };
}

export async function detectAgentSyncDrift(deps = {}) {
  const registry = deps.registry ?? readAgentRegistry();
  const registrySlugs = registry?.agents?.map((agent) => agent.slug ?? agent.creatorId).filter(Boolean) ?? [];
  let boardSlugs = [];
  let projectId = null;
  let boardOnline = false;
  let boardError = null;

  try {
    const board = deps.fetchBoardAgentIds
      ? await deps.fetchBoardAgentIds(deps)
      : await fetchBoardAgentIds(deps);
    boardSlugs = board.agentIds;
    projectId = board.projectId;
    boardOnline = true;
  } catch (err) {
    boardError = err.message;
  }

  const comparison = compareAgentSyncSets({
    personaSlugs: deps.personaSlugs ?? PERSONA_SLUGS,
    registrySlugs,
    boardSlugs,
  });

  return {
    ...comparison,
    boardOnline,
    boardError,
    projectId,
    registryPath: registry ? "loaded" : "missing",
  };
}

export function formatAgentSyncDriftWarning(result) {
  if (!result?.drift) return null;
  const parts = [];
  if (result.missingFromBoard?.length) {
    parts.push(`${result.missingFromBoard.length} persona(s) ausente(s) no board`);
  }
  if (result.missingFromRegistry?.length) {
    parts.push(`${result.missingFromRegistry.length} persona(s) ausente(s) no registry local`);
  }
  return `⚠ ${TASKBOARD_AGENT_SYNC_DRIFT}: ${parts.join("; ")} — rode npm run orchestration:taskboard -- sync-agents`;
}

export function warnAgentSyncDrift(result, deps = {}) {
  const message = formatAgentSyncDriftWarning(result);
  if (!message) return false;
  (deps.warn ?? console.warn)(message);
  return true;
}

export async function maybeAutoSyncAgents(source, deps = {}) {
  if (process.env.ORCHESTRATION_SKIP_AGENT_SYNC === "1") {
    return { ok: true, skipped: true, source, reason: "ORCHESTRATION_SKIP_AGENT_SYNC" };
  }
  try {
    const { syncAgentsToRegistry } = await import("./agent-taskboard-identity.mjs");
    const result = await syncAgentsToRegistry(deps);
    return { ok: true, source, ...result };
  } catch (err) {
    const warn = deps.warn ?? ((msg) => console.warn(msg));
    warn(`agent sync (${source}) falhou: ${err.message}`);
    return { ok: false, source, error: err.message };
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  detectAgentSyncDrift()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.drift) process.exit(2);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
