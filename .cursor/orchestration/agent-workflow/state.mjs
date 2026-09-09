/**
 * Estado de workflow por persona + issue.
 * Persistência: .cursor/orchestration-runtime/workflows/{persona}-{issue}.json
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPersona } from "../agent-dialogue/personas.mjs";
import { levelOf } from "../agent-hire/levels.mjs";
import { ISSUE_ID_RE } from "../agent-autonomy/lib.mjs";
import { formatIssueIdError, getOrchestrationPaths } from "../agent-config/load-config.mjs";

export const repoRoot = getOrchestrationPaths().projectRoot;
export const workflowsDir = getOrchestrationPaths().paths.workflows;

export const SILENCE_THRESHOLD_MS = 10 * 60 * 1000;

export function ensureWorkflowsDir() {
  if (!existsSync(workflowsDir)) mkdirSync(workflowsDir, { recursive: true });
}

export function workflowPath(persona, issueId) {
  return join(workflowsDir, `${persona}-${issueId}.json`);
}

export function assertWorkflowArgs(persona, issueId) {
  getPersona(persona);
  if (!issueId || !ISSUE_ID_RE.test(issueId)) {
    throw new Error(formatIssueIdError());
  }
}

/**
 * @param {string} persona
 * @param {string} issueId
 * @returns {object}
 */
export function loadWorkflowState(persona, issueId) {
  assertWorkflowArgs(persona, issueId);
  ensureWorkflowsDir();
  const path = workflowPath(persona, issueId);
  if (!existsSync(path)) {
    return createDefaultState(persona, issueId);
  }
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return { ...createDefaultState(persona, issueId), ...data };
  } catch {
    return createDefaultState(persona, issueId);
  }
}

/**
 * @param {string} persona
 * @param {string} issueId
 * @returns {object}
 */
export function createDefaultState(persona, issueId) {
  const p = getPersona(persona);
  const level = levelOf(persona) ?? "on-demand";
  return {
    version: 1,
    persona,
    issueId,
    level,
    role: p.role,
    gate: defaultGateForPersona(persona),
    step: defaultStepForPersona(persona),
    updatedAt: new Date().toISOString(),
    checklist: {
      agentsMdRead: false,
      taskboardEnsure: false,
      scopeAcknowledged: false,
      sessionStarted: false,
      ackPosted: false,
      lastStatusAt: null,
      lastDialogueAt: null,
      lastTaskboardCommentAt: null,
    },
    evidence: [],
    hiredWorkers: [],
    gateStatus: {},
    blockers: [],
  };
}

function defaultGateForPersona(persona) {
  const map = {
    orchestrator: "G0-G7",
    architect: "G0",
    "code-review-lead": "G2",
    "qa-lead": "G3",
    "security-lead": "G4",
    "red-team-lead": "G5",
    "github-lead": "G6",
    "docs-lead": "G6",
    researcher: "G0",
  };
  if (map[persona]) return map[persona];
  if (persona.endsWith("-executor")) return "G1";
  if (persona.endsWith("-critic")) return "G1";
  return "G0";
}

function defaultStepForPersona(persona) {
  if (persona === "orchestrator") return "monitor-board";
  if (persona === "architect") return "standby-consult";
  if (persona === "researcher") return "standby-research";
  if (persona.endsWith("-lead")) return "await-handoff";
  if (persona.endsWith("-executor")) return "pre-work-g0";
  if (persona.endsWith("-critic")) return "await-handoff";
  return "init";
}

/**
 * @param {string} persona
 * @param {string} issueId
 * @param {object} patch
 * @returns {object}
 */
export function saveWorkflowState(persona, issueId, patch = {}) {
  const current = loadWorkflowState(persona, issueId);
  const next = {
    ...current,
    ...patch,
    checklist: { ...current.checklist, ...(patch.checklist ?? {}) },
    gateStatus: { ...current.gateStatus, ...(patch.gateStatus ?? {}) },
    updatedAt: new Date().toISOString(),
  };
  ensureWorkflowsDir();
  writeFileSync(workflowPath(persona, issueId), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function loadAllWorkflowStates(levelFilter = null) {
  ensureWorkflowsDir();
  const states = [];
  if (!existsSync(workflowsDir)) return states;
  for (const file of readdirSync(workflowsDir)) {
    if (!file.endsWith(".json") || file.endsWith(".example.json")) continue;
    try {
      const data = JSON.parse(readFileSync(join(workflowsDir, file), "utf8"));
      if (levelFilter && data.level !== levelFilter) continue;
      states.push(data);
    } catch {
      // skip corrupt
    }
  }
  return states;
}
