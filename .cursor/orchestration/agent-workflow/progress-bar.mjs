#!/usr/bin/env node
/**
 * Barra de progresso por issue ANX-* — gates G0–G7, slices e status do board.
 *
 * Usage:
 *   npm run orchestration:progress -- --issue ANX-N [--json] [--no-slices]
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDialogueMessages } from "../agent-dialogue/dialogue-log.mjs";
import { extractLatestGateVerdicts } from "../agent-proactive/cto-evidence.mjs";
import { getOrchestrationPaths } from "../agent-config/load-config.mjs";
import { loadAllWorkflowStates } from "./state.mjs";
import { buildCompanyStageReport } from "../agent-lifecycle/phase-check.mjs";

export const CURSOR_PROGRESS_MARKER =
  "<!-- CURSOR_CHAT_PROGRESS: include at start of coordinator substantive turns -->";

export const GATE_IDS = ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"];

const PASS_VERDICTS = new Set(["PASS", "PASS_WITH_CONDITIONS", "NOT_APPLICABLE"]);
const BLOCK_VERDICTS = new Set(["BLOCKED", "CHANGES_REQUIRED"]);

const baseUrl = (
  process.env.TASKBOARD_URL ??
  process.env.CODEX_TASKBOARD_URL ??
  "http://127.0.0.1:47823"
).replace(/\/$/, "");

const MAC_TASKCTL =
  "/Applications/Codex Taskboard.app/Contents/Resources/bin/taskctl";

/**
 * @param {number} filled
 * @param {number} total
 * @param {number} [width]
 */
export function renderProgressBar(filled, total, width = 12) {
  if (total <= 0) return "░".repeat(width);
  const ratio = Math.max(0, Math.min(1, filled / total));
  const filledChars = Math.round(ratio * width);
  return `${"█".repeat(filledChars)}${"░".repeat(width - filledChars)}`;
}

/**
 * @param {"pending"|"in_progress"|"pass"|"blocked"|"not_applicable"} status
 */
export function gateIcon(status) {
  switch (status) {
    case "pass":
      return "✅";
    case "in_progress":
      return "⏳";
    case "blocked":
      return "❌";
    case "not_applicable":
      return "➖";
    default:
      return "⏳";
  }
}

/**
 * @param {Record<string, { status: string, verdict?: string|null }>} gates
 */
export function renderGateLine(gates) {
  return GATE_IDS.map((g) => `${g} ${gateIcon(gates[g]?.status ?? "pending")}`).join(" ");
}

function resolveTaskctl() {
  try {
    const out = execFileSync("which", ["taskctl"], { encoding: "utf8" }).trim();
    if (out) return out;
  } catch {
    // fall through
  }
  if (existsSync(MAC_TASKCTL)) return MAC_TASKCTL;
  return null;
}

const taskctl = resolveTaskctl();

export async function fetchTaskboardIssue(issueId) {
  try {
    const res = await fetch(`${baseUrl}/api/tasks`);
    if (!res.ok) return null;
    const data = await res.json();
    const tasks = data.tasks ?? (Array.isArray(data) ? data : []);
    return tasks.find((t) => t.identifier === issueId || t.id === issueId) ?? null;
  } catch {
    return null;
  }
}

export function fetchTaskboardComments(issueId) {
  if (!taskctl) return [];
  try {
    const data = JSON.parse(
      execFileSync(taskctl, ["comment", "list", issueId, "--json"], { encoding: "utf8" }),
    );
    return data.comments ?? [];
  } catch {
    return [];
  }
}

function loadWorkflowStatesForIssue(issueId) {
  return loadAllWorkflowStates().filter((s) => s.issueId === issueId);
}

function readDelegationQueueText(issueId) {
  const paths = getOrchestrationPaths();
  const candidates = [
    join(paths.frameworkRoot, "delegation-queue", `${issueId}.md`),
    join(paths.projectRoot, ".cursor", "orchestration", "delegation-queue", `${issueId}.md`),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return readFileSync(path, "utf8");
  }
  return "";
}

function verdictToStatus(verdict) {
  if (!verdict) return "pending";
  const v = verdict.toUpperCase();
  if (PASS_VERDICTS.has(v)) return "pass";
  if (BLOCK_VERDICTS.has(v)) return "blocked";
  return "pending";
}

function mergeDialogueGateVerdicts(issueId, baseVerdicts, messages) {
  const merged = { ...baseVerdicts };
  const VERDICT_ALT = "BLOCKED|PASS_WITH_CONDITIONS|PASS|CHANGES_REQUIRED|NOT_APPLICABLE";
  for (const m of [...messages].reverse()) {
    if (!m.gate || !/^G[0-7]$/.test(m.gate) || merged[m.gate]) continue;
    if (m.type === "verdict" || m.type === "decision" || m.type === "approve") {
      if (m.verdict) {
        merged[m.gate] = m.verdict;
        continue;
      }
      const bodyMatch = m.body?.match(
        new RegExp(`(?:Verdict|Disposi[cç][aã]o):\\s*\\*\\*?(${VERDICT_ALT})\\*\\*?`, "i"),
      );
      if (bodyMatch) merged[m.gate] = bodyMatch[1].toUpperCase();
    }
  }
  return merged;
}

function inferG0(messages, workflowStates, issueStatus) {
  const checklistOk = workflowStates.some(
    (s) => s.checklist?.agentsMdRead && s.checklist?.taskboardEnsure,
  );
  const hasAck = messages.some((m) => m.type === "ack");
  if (checklistOk || hasAck || issueStatus !== "backlog") return "pass";
  return issueStatus === "todo" ? "in_progress" : "pending";
}

function inferG1(messages, issueStatus) {
  const g1Verdict = messages.find(
    (m) =>
      m.type === "verdict" &&
      (m.gate === "G1" || m.from?.role === "critic") &&
      m.verdict,
  );
  if (g1Verdict?.verdict && PASS_VERDICTS.has(g1Verdict.verdict)) return "pass";
  if (messages.some((m) => m.type === "verdict" && m.gate === "G1" && BLOCK_VERDICTS.has(m.verdict))) {
    return "blocked";
  }
  if (issueStatus === "in_review" || issueStatus === "done") return "pass";
  if (issueStatus === "in_progress" && messages.some((m) => m.type === "ack")) return "in_progress";
  return "pending";
}

function inferG7(messages, issueStatus, gatesBeforeG7) {
  if (issueStatus === "done") return "pass";
  const g7Decision = messages.some(
    (m) =>
      (m.type === "decision" && m.gate === "G7") ||
      (m.type === "decision" && /cto-accept|aceite G7|G7 ACCEPT/i.test(m.body ?? "")),
  );
  if (g7Decision) return "in_progress";
  const priorComplete = ["G0", "G1", "G2", "G3", "G4", "G5", "G6"].every(
    (g) => gatesBeforeG7[g]?.status === "pass",
  );
  if (priorComplete && issueStatus === "in_review") return "in_progress";
  return "pending";
}

/**
 * @param {object} input
 * @returns {Record<string, { status: string, verdict: string|null }>}
 */
export function computeGateStatuses({
  issueId,
  issueStatus = "unknown",
  dialogueMessages = [],
  workflowStates = [],
  taskboardComments = [],
}) {
  const commentVerdicts = extractLatestGateVerdicts(taskboardComments);
  const mergedVerdicts = mergeDialogueGateVerdicts(issueId, commentVerdicts, dialogueMessages);

  const gates = {};
  gates.G0 = { status: inferG0(dialogueMessages, workflowStates, issueStatus), verdict: null };
  gates.G1 = { status: inferG1(dialogueMessages, issueStatus), verdict: null };

  for (const gate of ["G2", "G3", "G4", "G5", "G6"]) {
    const verdict = mergedVerdicts[gate] ?? null;
    gates[gate] = { status: verdictToStatus(verdict), verdict };
  }

  gates.G7 = {
    status: inferG7(dialogueMessages, issueStatus, gates),
    verdict: mergedVerdicts.G7 ?? null,
  };

  if (issueStatus === "in_progress" || issueStatus === "in_review") {
    for (const gate of GATE_IDS) {
      if (gates[gate].status === "pending") {
        gates[gate].status = "in_progress";
        break;
      }
    }
  }

  return gates;
}

/**
 * @param {object} input
 * @returns {{ total: number|null, completed: number, label: string|null }}
 */
export function computeSliceProgress({ dialogueMessages = [], delegationText = "" }) {
  const corpus = [
    delegationText,
    ...dialogueMessages.map((m) => m.body ?? ""),
  ].join("\n");

  let total = null;
  const rangeMatch = corpus.match(/Slices?\s+(\d+)\s*[-–]\s*(\d+)/i);
  const totalMatch = corpus.match(/(\d+)\s*slices?\b/i);
  const planSteps = dialogueMessages
    .filter((m) => m.type === "plan" && Array.isArray(m.plan?.steps))
    .flatMap((m) => m.plan.steps);

  if (rangeMatch) total = Math.max(Number(rangeMatch[1]), Number(rangeMatch[2]));
  else if (totalMatch) total = Number(totalMatch[1]);
  else if (planSteps.length > 0) total = planSteps.length;

  const completedSet = new Set();
  const passRe = /Slice\s+(\d+)\s+PASS/gi;
  let m;
  while ((m = passRe.exec(corpus)) !== null) {
    completedSet.add(Number(m[1]));
  }

  const fractionMatch = corpus.match(/Slices?:\s*(\d+)\s*\/\s*(\d+)/i);
  if (fractionMatch) {
    return {
      total: Number(fractionMatch[2]),
      completed: Number(fractionMatch[1]),
      label: null,
    };
  }

  if (total == null && completedSet.size === 0) {
    return { total: null, completed: 0, label: null };
  }

  const completed = completedSet.size;
  if (total == null) total = Math.max(completed, 1);

  return { total, completed: Math.min(completed, total), label: null };
}

/**
 * @param {Record<string, { status: string }>} gates
 */
export function computeOverallProgress(gates) {
  const completed = GATE_IDS.filter((g) => gates[g]?.status === "pass").length;
  const currentIdx = GATE_IDS.findIndex((g) => gates[g]?.status !== "pass");
  const currentGate = currentIdx === -1 ? "G7" : GATE_IDS[Math.max(0, currentIdx)];
  const percent = Math.round((completed / GATE_IDS.length) * 100);
  return { completed, total: GATE_IDS.length, currentGate, percent };
}

/**
 * @param {object} progress
 */
export function renderProgressMarkdown(progress) {
  const { issueId, issueStatus, gates, overall, slices, companyStage } = progress;
  const bar = renderProgressBar(overall.completed, overall.total);
  const lines = [
    `${issueId} ${bar} ${overall.currentGate}/${overall.total - 1} (${overall.percent}%) · ${issueStatus}`,
    renderGateLine(gates),
  ];

  if (companyStage) {
    lines.push(
      `Product Company: PC${companyStage.productCompanyStageNumber} · ${companyStage.productCompanyStageName} (${companyStage.productCompanyStage})`,
    );
  }

  if (slices.total != null) {
    const sliceBar = renderProgressBar(slices.completed, slices.total, 10);
    lines.push(`Slices: ${sliceBar} ${slices.completed}/${slices.total}`);
  }

  return lines.join("\n");
}

/**
 * @param {string} issueId
 * @param {object} [opts]
 */
export async function buildProgressReport(issueId, opts = {}) {
  const issue = opts.issue ?? (await fetchTaskboardIssue(issueId));
  const issueStatus = issue?.status ?? "unknown";
  const dialogueMessages = opts.dialogueMessages ?? readDialogueMessages({ issueId, limit: 1000 });
  const workflowStates = opts.workflowStates ?? loadWorkflowStatesForIssue(issueId);
  const taskboardComments = opts.taskboardComments ?? fetchTaskboardComments(issueId);
  const delegationText = opts.delegationText ?? readDelegationQueueText(issueId);

  const gates = computeGateStatuses({
    issueId,
    issueStatus,
    dialogueMessages,
    workflowStates,
    taskboardComments,
  });
  const overall = computeOverallProgress(gates);
  const slices = opts.includeSlices === false
    ? { total: null, completed: 0, label: null }
    : computeSliceProgress({ dialogueMessages, delegationText });

  const companyStage = buildCompanyStageReport(issueId, {
    gates,
    issueStatus,
  });

  return {
    issueId,
    issueStatus,
    issueTitle: issue?.title ?? null,
    gates,
    overall,
    slices,
    companyStage,
    markdown: renderProgressMarkdown({
      issueId,
      issueStatus,
      gates,
      overall,
      slices,
      companyStage,
    }),
  };
}

export function parseProgressArgs(argv) {
  const opts = { issue: null, json: false, includeSlices: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issue = argv[++i];
    else if (a === "--json") opts.json = true;
    else if (a === "--no-slices") opts.includeSlices = false;
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  if (!opts.issue) throw new Error("--issue ANX-N é obrigatório");
  return opts;
}

export async function cmdProgress(argv) {
  const opts = parseProgressArgs(argv);
  const report = await buildProgressReport(opts.issue, { includeSlices: opts.includeSlices });
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }
  console.log(`${CURSOR_PROGRESS_MARKER}\n\n${report.markdown}`);
  return report;
}

/**
 * Bloco markdown para prepend em chat-feed ou respostas de coordenador.
 * @param {string} issueId
 */
export async function buildChatProgressBlock(issueId) {
  if (!issueId) return "";
  const report = await buildProgressReport(issueId);
  return `${CURSOR_PROGRESS_MARKER}\n\n${report.markdown}\n`;
}

function usage() {
  console.log(`progress — barra de progresso G0–G7 por issue

Usage:
  npm run orchestration:progress -- --issue ANX-N [--json] [--no-slices]

Options:
  --issue ANX-N    Issue obrigatória
  --json           Saída estruturada
  --no-slices      Oculta linha de slices
`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    usage();
    process.exit(argv.length === 0 ? 1 : 0);
  }
  cmdProgress(argv).catch((err) => {
    console.error(`progress error: ${err.message}`);
    process.exit(1);
  });
}
