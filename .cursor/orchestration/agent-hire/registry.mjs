/**
 * Persistência do roster permanente e contratações on-demand.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildStrictIssueIdRegex,
  issueIdRequiredMessage,
  repoRoot as configRepoRoot,
} from "../agent-config/load-config.mjs";

import { getOrchestrationPaths } from "../agent-config/load-config.mjs";

const moduleDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = configRepoRoot;
export const hireDir = getOrchestrationPaths().paths.hire;
export const permanentRosterPath = join(hireDir, "permanent-roster.json");
export const activeOnDemandPath = join(hireDir, "active-on-demand.json");
export const hireLogPath = join(hireDir, "hire-log.jsonl");
export const activeAgentsPath = join(hireDir, "active-agents.json");

export const ISSUE_ID_RE = buildStrictIssueIdRegex();

export function ensureHireDirs() {
  if (!existsSync(hireDir)) mkdirSync(hireDir, { recursive: true });
}

function emptyPermanentRoster() {
  return { version: 1, bootstrappedAt: null, agents: [] };
}

function emptyActiveOnDemand() {
  return { version: 1, agents: [] };
}

export function loadPermanentRoster() {
  ensureHireDirs();
  if (!existsSync(permanentRosterPath)) return emptyPermanentRoster();
  return JSON.parse(readFileSync(permanentRosterPath, "utf8"));
}

export function savePermanentRoster(data) {
  ensureHireDirs();
  writeFileSync(permanentRosterPath, `${JSON.stringify(data, null, 2)}\n`);
  syncActiveAgentsMirror();
}

export function loadActiveOnDemand() {
  ensureHireDirs();
  if (!existsSync(activeOnDemandPath)) return emptyActiveOnDemand();
  return JSON.parse(readFileSync(activeOnDemandPath, "utf8"));
}

export function saveActiveOnDemand(data) {
  ensureHireDirs();
  writeFileSync(activeOnDemandPath, `${JSON.stringify(data, null, 2)}\n`);
  syncActiveAgentsMirror();
}

export function syncActiveAgentsMirror() {
  const permanent = loadPermanentRoster();
  const onDemand = loadActiveOnDemand();
  const mirror = {
    version: 1,
    updatedAt: new Date().toISOString(),
    permanent: permanent.agents,
    onDemand: onDemand.agents,
  };
  writeFileSync(activeAgentsPath, `${JSON.stringify(mirror, null, 2)}\n`);
}

export function appendHireLog(entry) {
  ensureHireDirs();
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  appendFileSync(hireLogPath, `${line}\n`);
}

export function findOnDemand(slug, issueId) {
  const data = loadActiveOnDemand();
  return data.agents.find((a) => a.slug === slug && a.issueId === issueId);
}

export function listOnDemandForIssue(issueId) {
  return loadActiveOnDemand().agents.filter((a) => a.issueId === issueId);
}

export function assertIssueId(issueId) {
  if (!issueId || !ISSUE_ID_RE.test(issueId)) {
    throw new Error(issueIdRequiredMessage());
  }
}
