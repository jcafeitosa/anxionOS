/**
 * Nucleo de verificacao de compliance obrigatorio — framework de orquestracao.
 * Consumido por compliance-check.mjs e hooks Cursor.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getActiveSession, loadSessions } from "../agent-dialogue/session-tracker.mjs";
import { readDialogueMessages } from "../agent-dialogue/dialogue-log.mjs";
import { getPersona } from "../agent-dialogue/personas.mjs";
import { loadWorkflowState, repoRoot, SILENCE_THRESHOLD_MS } from "../agent-workflow/state.mjs";
import { formatIssueIdHint, getOrchestrationPaths, getScopeDocPath } from "../agent-config/load-config.mjs";
import { dialogueForIssue } from "../agent-workflow/monitor.mjs";

import { getCursorSubagentType } from "../agent-hire/levels.mjs";

const SKILL_HINTS = {
  orchestrator: ["orchestrate-work", "manage-taskboard"],
  "backend-executor": ["test-driven-development", "karpathy-guidelines"],
  "code-review-lead": ["requesting-code-review"],
  "qa-lead": ["verification-before-completion", "run-smoke-tests"],
  "security-lead": ["review-security"],
  researcher: ["research-with-sources", "open-knowledge"],
};

export function getComplianceReminders({ persona, mode }) {
  const reminders = [];
  const sub = getCursorSubagentType(persona);
  if (persona === "orchestrator" || mode === "pre-work") {
    reminders.push("Delegate trabalho substancial via Task (Multitask Mode)? Ver CURSOR-AGENTS-INTEGRATION.md");
  }
  if (sub) {
    reminders.push(`Task subagent_type sugerido para ${persona}: ${sub}`);
  }
  const skills = SKILL_HINTS[persona] ?? ["manage-taskboard", "karpathy-guidelines"];
  for (const s of skills) {
    reminders.push(`Skill disponível: ${s} — ler SKILL.md antes de agir`);
  }
  reminders.push("MCP: GetDynamicTools antes de CallDynamicTool; open-knowledge para brain/");
  return reminders;
}


export const MODES = ["full", "pre-work", "pre-commit"];

const baseUrl = (
  process.env.TASKBOARD_URL ??
  process.env.CODEX_TASKBOARD_URL ??
  "http://127.0.0.1:47823"
).replace(/\/$/, "");

export async function taskboardOnline() {
  try {
    const res = await fetch(`${baseUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchIssue(issueId) {
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

export function agentsMdExists() {
  return existsSync(join(repoRoot, "AGENTS.md"));
}

export function scopeMdExists() {
  return existsSync(getScopeDocPath());
}

const graphifyIndexPath = () => join(repoRoot, ".graphify", "out", "graph.json");

export function graphifyIndexExists() {
  return existsSync(graphifyIndexPath());
}

/**
 * Avisos suaves de tooling (não bloqueiam compliance).
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateToolingWarnings() {
  const warnings = [];
  if (!agentsMdExists()) return warnings;

  if (!graphifyIndexExists()) {
    warnings.push({
      code: "GRAPHIFY_INDEX_MISSING",
      message:
        "Indice graphify ausente (.graphify/out/graph.json) — exploracao em massa deve usar npm run graphify:index primeiro",
      fix: "npm run graphify:index",
    });
    return warnings;
  }

  try {
    const mtime = statSync(graphifyIndexPath()).mtimeMs;
    const ageDays = (Date.now() - mtime) / (1000 * 60 * 60 * 24);
    if (ageDays > 7) {
      warnings.push({
        code: "GRAPHIFY_INDEX_STALE",
        message: `Indice graphify com mais de 7 dias (${Math.floor(ageDays)}d) — considere npm run graphify:index`,
        fix: "npm run graphify:index",
      });
    }
  } catch {
    // ignore stat errors — index check is best-effort
  }

  return warnings;
}

/**
 * Avisos quando dialogue ficou pendente de colar no chat Cursor.
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateDialogueDisplayWarnings(options = {}) {
  const warnings = [];
  const paths = getOrchestrationPaths(options).paths;
  const pendingChatPath = join(paths.dialogue, ".pending-chat-display");
  if (!existsSync(pendingChatPath)) return warnings;

  let issueHint = "";
  try {
    const pending = JSON.parse(readFileSync(pendingChatPath, "utf8"));
    if (pending?.issueId) issueHint = ` (${pending.issueId})`;
  } catch {
    // best-effort hint only
  }

  warnings.push({
    code: "PENDING_CHAT_DISPLAY",
    message: `Dialogue pendente de exibir no chat Cursor${issueHint}`,
    fix: "npm run orchestration:chat -- --check-pending (colar saida verbatim na resposta)",
  });
  return warnings;
}

/**
 * Violacao quando coordenador encerra turno sem colar dialogue no chat.
 * @param {string} persona
 * @param {string} mode
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateDialogueDisplayViolations(persona, mode = "full") {
  const violations = [];
  if (persona !== "orchestrator" || mode !== "pre-commit") return violations;
  const pendingWarnings = evaluateDialogueDisplayWarnings();
  if (pendingWarnings.length === 0) return violations;
  const pending = pendingWarnings[0];
  violations.push({
    code: pending.code,
    message: `${pending.message} — coordenador deve colar orchestration:chat antes de encerrar turno`,
    fix: pending.fix,
  });
  return violations;
}

function messageFromPersona(message, persona) {
  const slug = message.from?.persona?.role ?? message.from?.role;
  return slug === persona;
}

function ackSinceSession(persona, issueId, sessionStartedAt) {
  if (!sessionStartedAt) return false;
  const msgs = readDialogueMessages({ issueId, since: sessionStartedAt });
  return msgs.some((m) => messageFromPersona(m, persona) && m.type === "ack");
}

function lastStatusAgeMs(persona, issueId, sessionStartedAt) {
  const msgs = readDialogueMessages({ issueId, since: sessionStartedAt ?? undefined });
  const statusMsgs = msgs.filter(
    (m) => messageFromPersona(m, persona) && m.type === "status",
  );
  if (!statusMsgs.length) return null;
  const last = statusMsgs[statusMsgs.length - 1];
  return Date.now() - new Date(last.timestamp).getTime();
}

function sessionAgeMs(session) {
  if (!session?.startedAt) return 0;
  return Date.now() - new Date(session.startedAt).getTime();
}

function isExecutor(persona) {
  try {
    const p = getPersona(persona);
    return p.role === "executor" || persona.endsWith("-executor");
  } catch {
    return persona.endsWith("-executor");
  }
}

function resolveCriticSlug(persona, session) {
  try {
    return getPersona(persona).criticSlug ?? session?.criticSlug ?? null;
  } catch {
    return session?.criticSlug ?? null;
  }
}

function criticAckSinceSession(criticSlug, issueId, sessionStartedAt) {
  if (!criticSlug || !sessionStartedAt) return false;
  const msgs = readDialogueMessages({ issueId, since: sessionStartedAt });
  return msgs.some((m) => messageFromPersona(m, criticSlug) && m.type === "ack");
}

/**
 * Aviso suave: decision emitida fora do núcleo (apenas Renata ou @Owner G7).
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateCenterBypassWarnings(issueId) {
  const warnings = [];
  if (!issueId) return warnings;
  const msgs = readDialogueMessages({ issueId }).slice(-40);
  for (const m of msgs) {
    const fromSlug = m.from?.persona?.role ?? m.from?.role;
    if (m.type === "decision" && fromSlug && fromSlug !== "orchestrator") {
      warnings.push({
        code: "CENTER_BYPASS_DECISION",
        message: `decision emitida por ${fromSlug} — apenas Renata (orchestrator) no núcleo ou @Owner (G7)`,
        fix: "Escalar ao núcleo: @Owner + Renata + Cláudia (cto-critic)",
      });
      break;
    }
    if (m.type === "escalate") {
      const toSlug = m.to?.persona?.role ?? m.to?.role ?? "";
      if (toSlug === "owner" || (m.body && /@owner/i.test(m.body))) {
        warnings.push({
          code: "CENTER_BYPASS_ESCALATE",
          message: "escalate direto a @Owner sem passar pelo núcleo Renata+Cláudia",
          fix: "Rotear: C/B → Renata (+ Cláudia) → @Owner em exceções G7",
        });
        break;
      }
    }
  }
  return warnings;
}

/**
 * Aviso suave: Renata sem crítica de governança ativa na issue.
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateOrchestratorCriticPairing(persona, issueId) {
  const warnings = [];
  if (persona !== "orchestrator" || !issueId) return warnings;
  const criticSlug = "cto-critic";
  const criticSession = getActiveSession(criticSlug);
  if (!criticSession || criticSession.issueId !== issueId) {
    warnings.push({
      code: "MISSING_CTO_CRITIC_PAIR",
      message: `Renata sem crítica de governança ${criticSlug} ativa em ${issueId}`,
      fix: `npm run orchestration:session -- start --persona ${criticSlug} --issue ${issueId}`,
    });
  }
  return warnings;
}

/**
 * Level C executors exigem crítico pareado na mesma issue: criticSlug, sessão ativa e ack.
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateExecutorCriticPairing(persona, issueId, session, mode = "full") {
  const violations = [];
  if (!isExecutor(persona)) return violations;

  const criticSlug = resolveCriticSlug(persona, session);
  if (!criticSlug) {
    violations.push({
      code: "MISSING_CRITIC_PAIR",
      message: `Executor ${persona} sem criticSlug pareado (Level C exige crítico na mesma issue/thread)`,
      fix: "Consultar PERSONAS.md e personasFile no orchestration.config.json",
    });
    return violations;
  }

  const criticSession = getActiveSession(criticSlug);
  if (!criticSession || criticSession.issueId !== issueId) {
    violations.push({
      code: "MISSING_CRITIC_PAIR",
      message: `Crítico ${criticSlug} sem sessão ativa em ${issueId} (pareamento obrigatório)`,
      fix: `npm run orchestration:session -- start --persona ${criticSlug} --issue ${issueId}`,
    });
    return violations;
  }

  const requireAck = mode !== "pre-work" || Boolean(session?.issueId === issueId);
  if (requireAck && session?.startedAt && !criticAckSinceSession(criticSlug, issueId, session.startedAt)) {
    violations.push({
      code: "MISSING_CRITIC_PAIR",
      message: `Crítico ${criticSlug} sem ack no dialogue desde início da sessão do executor`,
      fix: `npm run orchestration:broadcast -- --from-persona ${criticSlug} --type ack --issue ${issueId} --body "ack pareamento" --evidence "cmd:orchestration:compliance"`,
    });
  }

  return violations;
}

export function evaluateCompliance(input) {
  const { persona, issueId, mode } = input;
  const violations = [];
  const taskboardOk = input.taskboardOk ?? false;
  const issue = input.issue ?? null;
  const session = input.session ?? null;
  const workflow = input.workflow ?? loadWorkflowState(persona, issueId);
  const dialogue = input.dialogue ?? dialogueForIssue(issueId, persona);
  const checklist = workflow.checklist ?? {};

  const fix = (cmd) => cmd;

  if (!taskboardOk) {
    violations.push({
      code: "TASKBOARD_OFFLINE",
      message: "Taskboard offline — abortar trabalho tecnico",
      fix: fix("npm run taskboard:ensure"),
    });
  }

  if (!agentsMdExists() || !checklist.agentsMdRead) {
    violations.push({
      code: "AGENTS_MD",
      message: "AGENTS.md nao confirmado (gate G0)",
      fix: fix(
        "Ler AGENTS.md + npm run orchestration:workflow -- sync --persona " +
          `${persona} --issue ${issueId}`,
      ),
    });
  }

  if (!checklist.taskboardEnsure && !taskboardOk) {
    violations.push({
      code: "TASKBOARD_ENSURE",
      message: "taskboard:ensure nao registrado no workflow",
      fix: fix("npm run taskboard:ensure"),
    });
  } else if (taskboardOk && !checklist.taskboardEnsure && mode !== "pre-work") {
    violations.push({
      code: "TASKBOARD_ENSURE",
      message: "taskboard:ensure nao sincronizado no workflow",
      fix: fix(
        `npm run orchestration:workflow -- sync --persona ${persona} --issue ${issueId}`,
      ),
    });
  }

  if (!scopeMdExists() || !checklist.scopeAcknowledged) {
    violations.push({
      code: "SCOPE",
      message: "SCOPE.md nao confirmado (gate G0.1)",
      fix: fix(
        "Ler .cursor/orchestration/SCOPE.md + npm run orchestration:workflow -- sync --persona " +
          `${persona} --issue ${issueId}`,
      ),
    });
  }

  if (mode === "pre-work") {
    if (issue && issue.status !== "in_progress") {
      violations.push({
        code: "ISSUE_NOT_IN_PROGRESS",
        message: `Issue ${issueId} nao esta in_progress (status: ${issue.status ?? "?"})`,
        fix: fix(`node scripts/taskboard.mjs move ${issueId} in_progress`),
      });
    }
    violations.push(...evaluateExecutorCriticPairing(persona, issueId, session, mode));
    const warnings = [
    ...evaluateToolingWarnings(),
    ...evaluateDialogueDisplayWarnings(),
    ...evaluateCenterBypassWarnings(issueId),
    ...evaluateOrchestratorCriticPairing(persona, issueId),
  ];
    const reminders = getComplianceReminders({ persona, mode });
    return { compliant: violations.length === 0, violations, warnings, reminders, mode, persona, issueId };
  }

  if (!issue) {
    violations.push({
      code: "ISSUE_NOT_FOUND",
      message: `Issue ${issueId} nao encontrada no taskboard`,
      fix: fix("npm run taskboard:list"),
    });
  } else if (issue.status !== "in_progress") {
    violations.push({
      code: "ISSUE_NOT_IN_PROGRESS",
      message: `Issue ${issueId} nao esta in_progress (status: ${issue.status})`,
      fix: fix(`node scripts/taskboard.mjs move ${issueId} in_progress`),
    });
  }

  if (!session || session.issueId !== issueId) {
    violations.push({
      code: "NO_SESSION",
      message: `Sessao orchestration:session inativa para ${persona} · ${issueId}`,
      fix: fix(
        `npm run orchestration:session -- start --persona ${persona} --issue ${issueId}`,
      ),
    });
  }

  if (!checklist.ackPosted && !dialogue.hasAck) {
    violations.push({
      code: "MISSING_ACK",
      message: "Ack nao postado no dialogue desta sessao/issue",
      fix: fix(
        `npm run orchestration:broadcast -- --from-persona ${persona} --type ack --issue ${issueId} --body "ack" --evidence "cmd:orchestration:compliance"`,
      ),
    });
  } else if (session && !checklist.ackPosted && !ackSinceSession(persona, issueId, session.startedAt)) {
    violations.push({
      code: "MISSING_ACK_SESSION",
      message: "Ack nao postado desde o inicio da sessao ativa",
      fix: fix(
        `npm run orchestration:broadcast -- --from-persona ${persona} --type ack --issue ${issueId} --body "ack sessao" --evidence "cmd:orchestration:compliance"`,
      ),
    });
  }

  if (session && sessionAgeMs(session) > SILENCE_THRESHOLD_MS) {
    const statusAge = lastStatusAgeMs(persona, issueId, session.startedAt);
    if (statusAge === null || statusAge > SILENCE_THRESHOLD_MS) {
      violations.push({
        code: "STALE_STATUS",
        message: "Sessao ativa >10min sem status recente no dialogue",
        fix: fix(
          `npm run orchestration:broadcast -- --from-persona ${persona} --type status --issue ${issueId} --body "status" --evidence "cmd:orchestration:compliance"`,
        ),
      });
    }
  }

  violations.push(...evaluateExecutorCriticPairing(persona, issueId, session, mode));

  if (mode === "pre-commit" && session) {
    const pendingPath = join(getOrchestrationPaths().paths.autonomy, "pending-broadcast.json");
    if (!existsSync(pendingPath)) {
      const turnHasDialogue =
        session.lastDialogueAt &&
        Date.parse(session.lastDialogueAt) >= Date.parse(session.startedAt);
      if (!turnHasDialogue) {
        violations.push({
          code: "PENDING_BROADCAST",
          message: "Encerrar turno com codigo requer pending-broadcast.json ou broadcast",
          fix: fix(
            "Gravar .cursor/orchestration-runtime/autonomy/pending-broadcast.json ou npm run orchestration:broadcast",
          ),
        });
      }
    }
    violations.push(...evaluateDialogueDisplayViolations(persona, mode));
  }

  const warnings = [...evaluateToolingWarnings(), ...evaluateDialogueDisplayWarnings()];
  const reminders = getComplianceReminders({ persona, mode });

  return {
    compliant: violations.length === 0,
    violations,
    warnings,
    reminders,
    mode,
    persona,
    issueId,
    workflow: { step: workflow.step, checklist },
  };
}

export async function runComplianceCheck({ persona, issueId, mode = "full" }) {
  if (!persona) throw new Error("--persona obrigatorio");
  if (!issueId) throw new Error(`--issue ${formatIssueIdHint()} obrigatorio`);
  if (!MODES.includes(mode)) throw new Error(`mode invalido: ${mode}`);

  getPersona(persona);

  const online = await taskboardOnline();
  const issue = online ? await fetchIssue(issueId) : null;
  const session = getActiveSession(persona);

  if (online) {
    const wf = loadWorkflowState(persona, issueId);
    const { saveWorkflowState } = await import("../agent-workflow/state.mjs");
    saveWorkflowState(persona, issueId, {
      checklist: {
        ...wf.checklist,
        agentsMdRead: agentsMdExists(),
        taskboardEnsure: true,
        scopeAcknowledged: scopeMdExists(),
        sessionStarted: Boolean(session?.issueId === issueId),
      },
    });
  }

  return evaluateCompliance({
    persona,
    issueId,
    mode,
    taskboardOk: online,
    issue,
    session,
  });
}

export function inferPersonaFromSessions(issueId) {
  const store = loadSessions();
  for (const session of Object.values(store.sessions)) {
    if (session.issueId === issueId) return session.persona;
  }
  return process.env.DIALOGUE_FROM_PERSONA ?? process.env.PROACTIVE_PERSONA ?? "orchestrator";
}
