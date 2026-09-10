/**
 * Registra todas as personas do roster no Dashi Taskboard (project_agents).
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getTaskboardProject } from "./load-config.mjs";
import { resolveAgentTaskboardIdentity } from "./agent-taskboard-identity.mjs";
import { PERSONA_SLUGS } from "../agent-dialogue/personas.mjs";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const root = join(moduleDir, "../../..");
const baseUrl = (
  process.env.TASKBOARD_URL ??
  process.env.CODEX_TASKBOARD_URL ??
  "http://127.0.0.1:47823"
).replace(/\/$/, "");
const projectName = process.env.TASKBOARD_PROJECT_NAME ?? getTaskboardProject() ?? "anxionOS";

async function defaultFetchHealth() {
  const res = await fetch(`${baseUrl}/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`health ${res.status}`);
}

async function httpJson(path, { method = "GET", body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error?.message ?? `${res.status} ${path}`);
  return data;
}

async function resolveProjectId(deps = {}) {
  if (process.env.TASKBOARD_PROJECT_ID) return process.env.TASKBOARD_PROJECT_ID;
  if (deps.projectId) return deps.projectId;
  const { projects } = await (deps.httpJson ?? httpJson)("/api/projects");
  const byPath = projects.find((p) => p.workspacePath === root);
  if (byPath) return byPath.id;
  const byName = projects.find((p) => p.name === projectName);
  if (byName) return byName.id;
  throw new Error(`Projeto "${projectName}" não encontrado em ${baseUrl}`);
}

export async function syncAgentsToTaskboard(deps = {}) {
  await (deps.fetchHealth ?? defaultFetchHealth)();
  const projectId = await resolveProjectId(deps);
  const slugs = deps.slugs ?? PERSONA_SLUGS;
  const results = [];
  for (const slug of slugs) {
    const identity = resolveAgentTaskboardIdentity(slug);
    const agent = await (deps.httpJson ?? httpJson)(`/api/projects/${encodeURIComponent(projectId)}/agents`, {
      method: "POST",
      body: { id: identity.creatorId, name: identity.creatorName },
    });
    results.push({ slug, agent: agent.agent, projectId });
  }
  return { ok: true, projectId, count: results.length, agents: results };
}

export async function syncAgentToTaskboard(personaSlug, deps = {}) {
  return syncAgentsToTaskboard({ ...deps, slugs: [personaSlug] });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const getOpt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  (async () => {
    try {
      if (cmd === "sync" || cmd === "sync-agents") {
        console.log(JSON.stringify(await syncAgentsToTaskboard({ projectId: getOpt("--project-id") }), null, 2));
        return;
      }
      if (cmd === "sync-agent") {
        const persona = getOpt("--persona");
        if (!persona) throw new Error("--persona SLUG obrigatório");
        console.log(JSON.stringify(await syncAgentToTaskboard(persona, { projectId: getOpt("--project-id") }), null, 2));
        return;
      }
      console.error("Usage: sync | sync-agents | sync-agent --persona SLUG");
      process.exit(cmd ? 1 : 0);
    } catch (e) { console.error(e.message); process.exit(1); }
  })();
}
