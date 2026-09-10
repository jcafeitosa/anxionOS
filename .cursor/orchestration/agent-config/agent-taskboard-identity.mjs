/**
 * Resolve identidade de persona para escritas assinadas no Dashi Taskboard.
 *
 * Usage (CLI):
 *   node agent-taskboard-identity.mjs resolve --persona backend-executor
 *   node agent-taskboard-identity.mjs resolve   # usa ORCHESTRATION_PERSONA
 *   node agent-taskboard-identity.mjs sync-agents [--json]
 *
 * Ver AGENT-TASKBOARD-SIGNATURE.md para limitação upstream (authorType=user).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPersona, PERSONA_SLUGS, resolvePersonaSlug } from "../agent-dialogue/personas.mjs";
import { getOrchestrationPaths, getTaskboardProject } from "./load-config.mjs";

export const AGENT_LABEL_PREFIX = "agent:";
const PERSONA_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

/**
 * @param {string} personaSlug
 * @returns {{ creatorType: 'agent', creatorId: string, creatorName: string, slug: string, fullName: string, shortName: string, role: string, team: string }}
 */
export function resolveAgentTaskboardIdentity(personaSlug) {
  if (!personaSlug?.trim()) {
    throw new Error("resolveAgentTaskboardIdentity requer persona slug (--persona ou ORCHESTRATION_PERSONA)");
  }
  const persona = getPersona(personaSlug.trim());
  const creatorName = `${persona.fullName} · ${persona.slug}`;
  if (!PERSONA_ID_PATTERN.test(persona.slug)) {
    throw new Error(`Slug de persona inválido para taskboard: ${persona.slug}`);
  }
  return {
    creatorType: "agent",
    creatorId: persona.slug,
    creatorName,
    slug: persona.slug,
    fullName: persona.fullName,
    shortName: persona.shortName,
    role: persona.role,
    team: persona.team,
  };
}

/**
 * @param {string | null | undefined} explicitPersona
 */
export function resolvePersonaFromEnv(explicitPersona = null) {
  const fromArg = explicitPersona?.trim();
  if (fromArg) return fromArg;
  const fromEnv = process.env.ORCHESTRATION_PERSONA?.trim();
  if (fromEnv) return fromEnv;
  return null;
}

/**
 * @param {string | null | undefined} explicitPersona
 */
export function resolveIdentity(explicitPersona = null) {
  const slug = resolvePersonaFromEnv(explicitPersona);
  if (!slug) return null;
  const resolved = resolvePersonaSlug(slug);
  if (!resolved) throw new Error(`Persona desconhecida: ${slug}`);
  return resolveAgentTaskboardIdentity(resolved.slug);
}

export function resolveThreadId() {
  return (
    process.env.CURSOR_THREAD_ID ??
    process.env.CODEX_THREAD_ID ??
    process.env.CLAUDE_CODE_SESSION_ID ??
    null
  );
}

/**
 * @param {{ creatorId: string, creatorName: string, creatorType?: string }} identity
 */
export function personaAgentLabel(slug) {
  return `${AGENT_LABEL_PREFIX}${slug}`;
}

export function mergePersonaAgentLabel(existingLabels, slug) {
  const labels = [...(existingLabels ?? [])];
  const label = personaAgentLabel(slug);
  if (!labels.includes(label)) labels.push(label);
  return labels;
}

export function prefixSignedCommentBody(identity, body) {
  const prefix = `[${identity.creatorName}]`;
  const trimmed = String(body ?? "").trimStart();
  if (trimmed.startsWith(prefix)) return trimmed;
  return `${prefix}\n\n${trimmed}`;
}

/**
 * Headers aceitos pelo taskboard. Não enviar `x-taskboard-client: taskctl`.
 * @param {{ creatorId: string, creatorName: string }} identity
 */
export const TASKBOARD_CLIENT_CURSOR = "cursor";

export function resolveTaskboardClientHeader() {
  const explicit = process.env.TASKBOARD_CLIENT?.trim().toLowerCase();
  if (explicit === "cursor" || explicit === "cursor-orchestration") return explicit;
  if (process.env.CURSOR_THREAD_ID?.trim()) return TASKBOARD_CLIENT_CURSOR;
  return TASKBOARD_CLIENT_CURSOR;
}

export function buildActorHeaders(identity) {
  const encodedName = encodeURIComponent(identity.creatorName);
  const threadId = resolveThreadId();
  return {
    "x-taskboard-client": resolveTaskboardClientHeader(),
    "x-taskboard-user-id": identity.creatorId,
    "x-taskboard-user-name": encodedName,
    "x-taskboard-agent-id": identity.creatorId,
    "x-taskboard-agent-name": encodedName,
    "x-taskboard-agent-type": identity.creatorType ?? "agent",
    ...(threadId ? { "x-cursor-thread-id": threadId } : {}),
  };
}

function registryPath() {
  const { paths } = getOrchestrationPaths();
  return join(paths.runtime, "taskboard", "agent-registry.json");
}

export function buildAgentRegistry() {
  const project = process.env.TASKBOARD_PROJECT_NAME ?? getTaskboardProject() ?? "anxionOS";
  const syncedAt = new Date().toISOString();
  const agents = PERSONA_SLUGS.map((slug) => {
    const identity = resolveAgentTaskboardIdentity(slug);
    return {
      slug,
      creatorId: identity.creatorId,
      creatorName: identity.creatorName,
      label: personaAgentLabel(slug),
      headers: buildActorHeaders(identity),
    };
  });
  return {
    version: 1,
    project,
    syncedAt,
    taskboardApi: "POST /api/projects/:id/agents",
    agentCount: agents.length,
    agents,
  };
}

export function writeAgentRegistry(registry = buildAgentRegistry()) {
  const path = registryPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return { path, registry };
}

export function readAgentRegistry() {
  const path = registryPath();
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export async function syncAgentsToRegistry(deps = {}) {
  const baseUrl = (
    process.env.TASKBOARD_URL ??
    process.env.CODEX_TASKBOARD_URL ??
    "http://127.0.0.1:47823"
  ).replace(/\/$/, "");
  const fetchHealth =
    deps.fetchHealth ??
    (async () => {
      const res = await fetch(`${baseUrl}/health`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`health ${res.status}`);
    });
  await fetchHealth();
  const write = deps.writeRegistry ?? writeAgentRegistry;
  const { path, registry } = write(buildAgentRegistry());
  let taskboard = null;
  try {
    const { syncAgentsToTaskboard } = await import("./agent-taskboard-sync-agents.mjs");
    taskboard = await syncAgentsToTaskboard({ ...deps, fetchHealth: async () => {} });
  } catch (err) {
    taskboard = { ok: false, error: err.message };
  }
  return {
    ok: true,
    path,
    agentCount: registry.agentCount,
    syncedAt: registry.syncedAt,
    taskboard,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (cmd === "resolve") {
    let persona = null;
    for (let i = 1; i < args.length; i += 1) {
      if (args[i] === "--persona") persona = args[++i];
    }
    try {
      const identity = resolveIdentity(persona);
      if (!identity) {
        console.error("Erro: informe --persona SLUG ou ORCHESTRATION_PERSONA");
        process.exit(1);
      }
      console.log(JSON.stringify(identity, null, 2));
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  } else if (cmd === "sync-agents") {
    syncAgentsToRegistry()
      .then((result) => {
        if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
        else console.log(`✓ ${result.agentCount} personas → ${result.path}`);
      })
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  } else {
    console.log(`Usage:
  node agent-taskboard-identity.mjs resolve [--persona SLUG]
  node agent-taskboard-identity.mjs sync-agents [--json]`);
    process.exit(cmd ? 1 : 0);
  }
}
