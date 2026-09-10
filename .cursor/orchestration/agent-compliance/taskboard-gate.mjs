/**
 * Validação compartilhada taskboard-as-gate — compliance, broadcast, session, hire.
 */

import { formatIssueIdHint } from "../agent-config/load-config.mjs";
import {
  cursorGoalsEnsure,
  resolveScope,
  resolveTaskboardRouting,
} from "../agent-config/taskboard-routing.mjs";
import { getTaskboardCacheStatus } from "./taskboard-cache.mjs";

const GATE_HANDOFF_TYPES = new Set(["handoff", "verdict", "block", "unblock", "decision"]);
const ALLOWED_ORCHESTRATOR_REVIEW_STATUSES = new Set(["in_review"]);

export function isAllowedIssueStatus(ctx) {
  const { persona, mode, issueStatus, gateHandoff = false } = ctx;
  if (issueStatus === "in_progress") return true;
  if (
    persona === "orchestrator" &&
    mode === "pre-commit" &&
    ALLOWED_ORCHESTRATOR_REVIEW_STATUSES.has(issueStatus) &&
    gateHandoff
  ) {
    return true;
  }
  return false;
}

export function evaluateTaskboardViolations(input) {
  const {
    issueId,
    issue,
    persona = "orchestrator",
    mode = "full",
    taskboardOk = true,
    gateHandoff = false,
    requireClaim = true,
    scope = "auto",
    changedPaths = null,
  } = input;

  const violations = [];
  const fix = (cmd) => cmd;
  const blockingModes = new Set(["pre-work", "pre-commit", "full"]);
  const resolvedScope = resolveScope({ scope, issueId, issue, changedPaths });
  const routing = resolveTaskboardRouting({ scope: resolvedScope.scope ?? "project", issueId, issue, changedPaths });

  if (routing.scope === "framework" && routing.board === "cursor") {
    if (!issueId?.trim()) {
      violations.push({
        code: "MISSING_DIALOGUE_REF",
        message: "Framework work requer referencia de dialogue (--issue ANX-N ou goal id)",
        fix: fix("npm run orchestration:cursor-goals -- register --id fw-goal --objective TEXT --persona SLUG"),
      });
    }
    if (blockingModes.has(mode)) {
      const goalGate = cursorGoalsEnsure();
      if (!goalGate.ok) {
        violations.push({
          code: "CURSOR_GOAL_MISSING",
          message: "Framework scope exige Cursor taskboard (CURSOR_GOAL_ID ou goal ativo no registry)",
          fix: fix(goalGate.fix),
        });
      }
    }
    return violations;
  }

  if (!issueId?.trim()) {
    violations.push({
      code: "MISSING_ISSUE_ID",
      message: `Issue ${formatIssueIdHint()} obrigatoria — zero trabalho fora do board`,
      fix: fix("npm run taskboard:list && node scripts/taskboard.mjs move ANX-N in_progress"),
    });
    if (isExecutorLike(persona) && mode === "pre-work") {
      violations.push({
        code: "WORK_WITHOUT_BOARD_ISSUE",
        message: "Executor sem issue ANX-* claimada no taskboard",
        fix: fix(`npm run taskboard:ensure && node scripts/taskboard.mjs move ${formatIssueIdHint()} in_progress`),
      });
    }
    return violations;
  }

  const cacheStatus = getTaskboardCacheStatus();
  if (cacheStatus.failed) {
    violations.push({
      code: "TASKBOARD_ENSURE_FAILED",
      message: `Ultimo taskboard:ensure falhou (${cacheStatus.cache.error ?? "offline"})`,
      fix: fix("npm run taskboard:ensure"),
    });
  } else if (cacheStatus.cache.checkedAt && cacheStatus.stale && blockingModes.has(mode)) {
    violations.push({
      code: "TASKBOARD_ENSURE_STALE",
      message: "taskboard:ensure nao executado recentemente (cache >5min)",
      fix: fix("npm run taskboard:ensure"),
    });
  }

  if (!taskboardOk) {
    violations.push({
      code: "TASKBOARD_OFFLINE",
      message: "Taskboard offline — abortar trabalho tecnico",
      fix: fix("npm run taskboard:ensure"),
    });
  }

  if (!issue) {
    violations.push({
      code: "ISSUE_NOT_FOUND",
      message: `Issue ${issueId} nao encontrada no taskboard`,
      fix: fix("npm run taskboard:list"),
    });
    return violations;
  }

  if (requireClaim && blockingModes.has(mode)) {
    const status = issue.status ?? issue.task?.status;
    if (!isAllowedIssueStatus({ persona, mode, issueStatus: status, gateHandoff })) {
      violations.push({
        code: "ISSUE_NOT_IN_PROGRESS",
        message: `Issue ${issueId} nao esta in_progress (status: ${status ?? "?"})`,
        fix: fix(`node scripts/taskboard.mjs move ${issueId} in_progress`),
      });
    }
  }

  if (isExecutorLike(persona) && mode === "pre-work" && !issue) {
    violations.push({
      code: "WORK_WITHOUT_BOARD_ISSUE",
      message: `Executor ${persona} sem issue valida no board`,
      fix: fix(`node scripts/taskboard.mjs get ${issueId}`),
    });
  }

  return violations;
}

function isExecutorLike(persona) {
  if (!persona) return false;
  return persona.endsWith("-executor") || persona === "generalPurpose";
}

export function softValidateIssueBinding(issueId, issue) {
  if (!issueId?.trim()) {
    return `Issue ${formatIssueIdHint()} obrigatoria — rode npm run taskboard:ensure e claim antes de continuar`;
  }
  if (!issue) {
    return `Issue ${issueId} nao encontrada no taskboard — verifique npm run taskboard:list`;
  }
  return null;
}

export { GATE_HANDOFF_TYPES };


/**
 * Valida issue no board antes de writes (broadcast, session, hire).
 * @returns {Promise<boolean>} false = soft fail (mensagem já impressa)
 */
export async function validateIssueForWrite(issueId, fetchIssueFn, { label = 'taskboard-gate' } = {}) {
  const issue = issueId ? await fetchIssueFn(issueId) : null;
  const msg = softValidateIssueBinding(issueId, issue);
  if (msg) {
    console.error(`⛔ ${label}: ${msg}`);
    return false;
  }
  return true;
}
