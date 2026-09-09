/**
 * Utilitários compartilhados da Agent Autonomy Layer.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PERSONA_SLUGS, getPersona } from "../agent-dialogue/personas.mjs";
import {
  buildStrictIssueIdRegex,
  formatIssueIdHint,
  getOrchestrationPaths,
} from "../agent-config/load-config.mjs";

const paths = getOrchestrationPaths();
export const repoRoot = paths.projectRoot;
export const autonomyDir = paths.paths.autonomy;
export const registryPath = join(autonomyDir, "registry.json");
export const autonomyLogPath = join(autonomyDir, "autonomy.jsonl");
export const hooksJsonPath = paths.paths.hooksJson;
export const hooksDir = paths.paths.hooks;
export const loopsDir = join(autonomyDir, "loops");
export const cronStatePath = join(autonomyDir, "cron-state.json");

export const ISSUE_ID_RE = buildStrictIssueIdRegex();

export const FORBIDDEN_COMMAND_PATTERNS = [
  /\bgit\s+push\b[^\n]*--force\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+commit\b/i,
  /\bgit\s+rebase\s+-i\b/i,
  /\bgit\s+clean\s+-fd\b/i,
  /\brm\s+-rf\s+\/\b/i,
];

export function parseIntervalMs(interval) {
  if (!interval) throw new Error("interval required (e.g. 30s, 5m, 2h, 1d)");
  const match = String(interval).trim().match(/^(\d+(?:\.\d+)?)(s|m|h|d)$/i);
  if (!match) {
    throw new Error(`Invalid interval "${interval}". Use 30s, 5m, 2h, 1d`);
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Math.round(value * multipliers[unit]);
}

export function assertPersona(persona, asOrchestrator = false) {
  if (!persona) throw new Error("--persona SLUG is required");
  if (persona === "orchestrator" || asOrchestrator) {
    getPersona(persona === "orchestrator" ? "orchestrator" : persona);
    return persona === "orchestrator" ? "orchestrator" : persona;
  }
  if (!PERSONA_SLUGS.includes(persona)) {
    throw new Error(`Unknown persona "${persona}". Valid: ${PERSONA_SLUGS.join(", ")}`);
  }
  return persona;
}

export function assertSafeCommand(command) {
  if (!command?.trim()) throw new Error("command is required");
  for (const pattern of FORBIDDEN_COMMAND_PATTERNS) {
    if (pattern.test(command)) {
      throw new Error(`Command blocked by autonomy policy: matches ${pattern}`);
    }
  }
}

export function assertIssueClaim(issueId, resourceType) {
  if (!issueId || !ISSUE_ID_RE.test(issueId)) {
    throw new Error(`${resourceType} requires --issue ${formatIssueIdHint()} (claimed issue)`);
  }
}

export function ensureAutonomyDirs() {
  for (const dir of [autonomyDir, loopsDir, hooksDir]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

export function loadRegistry() {
  ensureAutonomyDirs();
  if (!existsSync(registryPath)) return emptyRegistry();
  try {
    const data = JSON.parse(readFileSync(registryPath, "utf8"));
    return normalizeRegistry(data);
  } catch (err) {
    throw new Error(`Failed to read registry: ${err.message}`);
  }
}

export function saveRegistry(registry) {
  ensureAutonomyDirs();
  registry.updatedAt = new Date().toISOString();
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

function emptyRegistry() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    resources: { hooks: [], loops: [], crons: [], goals: [] },
  };
}

function normalizeRegistry(data) {
  const base = emptyRegistry();
  if (!data || typeof data !== "object") return base;
  return {
    version: 1,
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    resources: {
      hooks: Array.isArray(data.resources?.hooks) ? data.resources.hooks : [],
      loops: Array.isArray(data.resources?.loops) ? data.resources.loops : [],
      crons: Array.isArray(data.resources?.crons) ? data.resources.crons : [],
      goals: Array.isArray(data.resources?.goals) ? data.resources.goals : [],
    },
  };
}

export function assertOwnership(kind, id, actorPersona, asOrchestrator = false) {
  const registry = loadRegistry();
  const list = registry.resources[kind] ?? [];
  const item = list.find((r) => r.id === id);
  if (!item) throw new Error(`${kind} "${id}" not found`);
  if (asOrchestrator || actorPersona === "orchestrator") return item;
  if (item.persona !== actorPersona) {
    throw new Error(
      `Cannot modify ${kind} "${id}" owned by ${item.persona}. Use orchestrator or --as-orchestrator.`,
    );
  }
  return item;
}

export function baseResource(opts) {
  const now = new Date().toISOString();
  return {
    id: opts.id,
    persona: opts.persona,
    issueId: opts.issueId ?? null,
    enabled: opts.enabled ?? true,
    createdAt: opts.createdAt ?? now,
    updatedAt: now,
    description: opts.description ?? null,
  };
}

export function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}
