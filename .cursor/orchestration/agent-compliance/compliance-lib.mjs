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
import { evaluateDelegationFeedbackWarnings } from "../agent-workflow/delegate-monitor.mjs";
import {
  evaluateCrossChatClaimConflicts,
  evaluateIssueLockHeld,
} from "../agent-workflow/issue-coordination.mjs";
import { recordTaskboardEnsure } from "./taskboard-cache.mjs";
import { evaluateTaskboardViolations, GATE_HANDOFF_TYPES } from "./taskboard-gate.mjs";
import { resolveTaskboardRouting } from "../agent-config/taskboard-routing.mjs";
import { detectReservationsInCorpus } from "../agent-proactive/cto-evidence.mjs";
import {
  evaluateBrainConsultationWarnings,
  evaluateReflectionPendingWarnings,
  hasBrainReference,
} from "../agent-brain/brain-reflection.mjs";
import { evaluateCapabilitiesUnderusedWarnings } from "./capabilities-gate.mjs";
import { evaluateTeamInteractionWarnings } from "../agent-dialogue/google-team-rituals.mjs";
import {
  evaluateActivePersonaWarnings,
  evaluatePersonaIdentityWarnings,
} from "../agent-dialogue/persona-identity.mjs";

export { evaluateTaskboardViolations, GATE_HANDOFF_TYPES };
export {
  evaluateBrainConsultationWarnings,
  evaluateReflectionPendingWarnings,
  hasBrainReference,
} from "../agent-brain/brain-reflection.mjs";
export { evaluateCapabilitiesUnderusedWarnings } from "./capabilities-gate.mjs";

import { getCursorSubagentType } from "../agent-hire/levels.mjs";
import { countByStatus, listDispatches } from "../agent-delegation/dispatch-queue.mjs";

const SKILL_HINTS = {
  orchestrator: ["orchestrate-work", "manage-taskboard"],
  "backend-executor": ["test-driven-development", "karpathy-guidelines"],
  "code-review-lead": ["requesting-code-review"],
  "qa-lead": ["verification-before-completion", "run-smoke-tests"],
  "security-lead": ["review-security"],
  researcher: ["research-with-sources", "open-knowledge"],
};

export function evaluateDispatchPendingWarnings(persona) {
  if (persona !== "orchestrator") return [];
  const counts = countByStatus();
  if (counts.pending === 0) return [];
  const pending = listDispatches({ status: "pending" }).slice(0, 3);
  const summary = pending.map((p) => `${p.persona}·${p.issueId}`).join(", ");
  return [
    {
      code: "DISPATCH_PENDING",
      message: `${counts.pending} teammate(s) na fila sem Task spawnado (${summary})`,
      fix: "npm run orchestration:dispatch -- inject → invocar Task para cada item; ver GROK-BOT-PARITY.md",
    },
  ];
}

export function getComplianceReminders({ persona, mode }) {
  const reminders = [];
  const sub = getCursorSubagentType(persona);
  if (persona === "orchestrator" || mode === "pre-work") {
    reminders.push("Delegate trabalho substancial via Task (Multitask Mode)? Ver CURSOR-AGENTS-INTEGRATION.md");
  }
  if (COORDINATOR_PERSONAS.has(persona)) {
    reminders.push(
      "Chat nativo: responder com blocos persona (---), min 2; colar orchestration:chat --new-only apos subagentes — ver CHAT-PARTICIPATION.md",
    );
  }
  reminders.push(
    "Voz natural PT-BR por persona — informal, tecnico, humor leve; ver PERSONA-VOICE.md (warning PERSONA_ROBOTIC se parecer Assistant)",
  );
  if (sub) {
    reminders.push(`Task subagent_type sugerido para ${persona}: ${sub}`);
  }
  const skills = SKILL_HINTS[persona] ?? ["manage-taskboard", "karpathy-guidelines"];
  for (const s of skills) {
    reminders.push(`Skill disponível: ${s} — ler SKILL.md antes de agir`);
  }
  reminders.push("MCP: GetDynamicTools antes de CallDynamicTool; open-knowledge para brain/");
  reminders.push(
    "Capacidades completas: internet/RAG (WebSearch/context7), executar comandos (nao describe-only), MCPs — ver AGENT-CAPABILITIES.md",
  );
  reminders.push(
    "Brain loop: consultar brain/ antes de codar; reflect apos CHANGES_REQUIRED — ver OPENKNOWLEDGE-BRAIN.md",
  );
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
    const ok = res.ok;
    recordTaskboardEnsure(ok, { url: baseUrl, error: ok ? null : `HTTP ${res.status}` });
    return ok;
  } catch (err) {
    recordTaskboardEnsure(false, { url: baseUrl, error: err?.message ?? "fetch failed" });
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

const COORDINATOR_PERSONAS = new Set(["orchestrator", "cto-critic"]);

/**
 * Aviso quando coordenador deve usar blocos persona no chat (nao monologo Assistant).
 * @param {string} persona
 * @param {{ pendingChat?: boolean }} [options]
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateCoordinatorMonologueWarnings(persona, options = {}) {
  const warnings = [];
  if (!COORDINATOR_PERSONAS.has(persona)) return warnings;

  const pendingChat =
    options.pendingChat ?? evaluateDialogueDisplayWarnings().length > 0;

  warnings.push({
    code: "COORDINATOR_MONOLOGUE",
    message: pendingChat
      ? "Dialogue pendente no JSONL — coordenador deve colar orchestration:chat e responder com 2+ blocos persona (---), nao voz Assistant"
      : "Em threads de orquestracao, coordenador responde com blocos persona (min 2) + orchestration:chat apos subagentes — proibido monologo generico",
    fix: "Ver CHAT-PARTICIPATION.md § Coordinator anti-patterns; npm run orchestration:chat -- --new-only (colar verbatim) + blocos --- por persona",
  });
  return warnings;
}


const HIERARCHY_EVIDENCE_RE =
  /(?:--evidence\b|(?:^|\s)(?:command|file|issue|path|evidence):|\bevidence:\s*\n)/im;
const HIERARCHY_ROUTING_MENTION_RE =
  /@(?:lucas|marina|camila|paulo|fernanda|edu|isa|thiago|ju|andre|marcus|claudia|cláudia|diego|rafael|gustavo|bia|helena|owner)/i;
const HIERARCHY_ROUTING_VERB_RE =
  /\b(delego|encaminho|roteio|handoff|passo a|pergunto ao|consulto @|roteio para|@\w+ — @owner)/i;
const HIERARCHY_TECHNICAL_RE =
  /\b(test(?:e|es|ado|ar|s)?|coverage|migrate|lint|build|api|endpoint|backend|frontend|diff|m[oó]dulo|implement|cod(?:e|ar|igo)|bug|fix|refactor|typescript|bun test|npm run|middleware|auth header|security|migrate)\b/i;
const HIERARCHY_NOT_VERIFIED_RE = /n[aã]o verificado/i;

/**
 * Aviso suave: orchestrator responde pergunta tecnica sem handoff @mention ou evidencia.
 * @param {string} persona
 * @param {{ text?: string|null }} [options]
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateHierarchyProxyAnswerWarnings(persona, options = {}) {
  const warnings = [];
  if (persona !== "orchestrator") return warnings;

  const text = options.text ?? readPendingBroadcastText();
  if (!text || typeof text !== "string") return warnings;
  const trimmed = text.trim();
  if (trimmed.length < 30) return warnings;

  if (!HIERARCHY_TECHNICAL_RE.test(trimmed)) return warnings;
  if (HIERARCHY_NOT_VERIFIED_RE.test(trimmed)) return warnings;
  if (HIERARCHY_EVIDENCE_RE.test(trimmed)) return warnings;

  const hasRouting =
    HIERARCHY_ROUTING_MENTION_RE.test(trimmed) && HIERARCHY_ROUTING_VERB_RE.test(trimmed);
  if (hasRouting) return warnings;

  warnings.push({
    code: "HIERARCHY_PROXY_ANSWER",
    message:
      "Orquestrador respondeu conteudo tecnico sem handoff @mention ao owner competente nem bloco de evidencia (command:/file:/issue:)",
    fix: "Ver QUESTION-HIERARCHY.md — rotear @mention ao lead/executor; resposta com --evidence ou declarar nao verificado + comando",
  });
  return warnings;
}

const MENTION_RE = /@(?:owner|[a-z][a-z0-9_-]*)/i;
const PERSONA_BLOCK_RE = /^---\s*\n\*\*[A-ZÀ-Ú]/m;
const GENERIC_ASSISTANT_RE =
  /^(?:I have|I've|Here is|Here are|As an AI|Sure!?|Certainly|Completed|Summary|Status update)/im;
const ASSISTANT_PHRASE_RE = /\b(as an assistant|I will help you|happy to help)\b/i;

/**
 * Le texto candidato a resposta no chat (pending-broadcast body).
 * @param {{ paths?: ReturnType<typeof getOrchestrationPaths>['paths'] }} [options]
 * @returns {string|null}
 */
function readPendingBroadcastPayload(options = {}) {
  const paths = getOrchestrationPaths(options).paths;
  const pendingPath = join(paths.autonomy, "pending-broadcast.json");
  if (!existsSync(pendingPath)) return null;
  try {
    return JSON.parse(readFileSync(pendingPath, "utf8"));
  } catch {
    return null;
  }
}

function detectGateHandoff() {
  const pending = readPendingBroadcastPayload();
  const type = pending?.type ?? pending?.messageType;
  return type && GATE_HANDOFF_TYPES.has(type);
}

export function readPendingBroadcastText(options = {}) {
  const paths = getOrchestrationPaths(options).paths;
  const pendingPath = join(paths.autonomy, "pending-broadcast.json");
  if (!existsSync(pendingPath)) return null;
  try {
    const pending = JSON.parse(readFileSync(pendingPath, "utf8"));
    const body = pending?.body ?? pending?.message ?? pending?.text;
    return typeof body === "string" && body.trim() ? body.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Heuristica suave: texto sem @mention e com padroes de assistant generico.
 * @param {string|null|undefined} text
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluatePersonaRoboticWarnings(text) {
  const warnings = [];
  if (!text || typeof text !== "string") return warnings;
  const trimmed = text.trim();
  if (trimmed.length < 40) return warnings;
  if (MENTION_RE.test(trimmed)) return warnings;
  if (PERSONA_BLOCK_RE.test(trimmed)) return warnings;

  const lines = trimmed.split("\n");
  const bulletLines = (trimmed.match(/^[\-*•]\s+/gm) || []).length;
  const bulletHeavy = bulletLines >= 3 && bulletLines / Math.max(lines.length, 1) > 0.5;
  const genericOpener = GENERIC_ASSISTANT_RE.test(trimmed);
  const assistantPhrase = ASSISTANT_PHRASE_RE.test(trimmed);

  if (bulletHeavy || genericOpener || assistantPhrase) {
    warnings.push({
      code: "PERSONA_ROBOTIC",
      message: "Texto parece voz generica de assistant (sem @mention nem bloco persona)",
      fix: "Reescrever com voz da persona em PERSONA-VOICE.md; incluir @mention e blocos ---",
    });
  }
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

/**
 * Em pre-commit, PENDING_CHAT_DISPLAY ja e violacao (orchestrator) — nao duplicar como warning.
 * @param {{ code: string }[]} warnings
 * @param {string} mode
 * @param {{ code: string }[]} violations
 */
function filterDialogueDisplayWarningsForMode(warnings, mode, violations) {
  if (mode !== "pre-commit") return warnings;
  const blockedCodes = new Set(violations.map((v) => v.code));
  return warnings.filter((w) => !(w.code === "PENDING_CHAT_DISPLAY" && blockedCodes.has(w.code)));
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


export function evaluateDoneWithReservationsWarnings(issue, comments = []) {
  const warnings = [];
  if (!issue || issue.status !== "done") return warnings;
  const corpus = comments.map((c) => `${c.title ?? ""}\n${c.body ?? ""}`).join("\n---\n");
  const hits = detectReservationsInCorpus(corpus);
  if (hits.length > 0) {
    warnings.push({
      code: "DONE_WITH_RESERVATIONS",
      message: hits.join("; "),
      fix: "Corrigir escopo ou reabrir issue — ver ZERO-RESERVATIONS-DONE.md",
    });
  }
  return warnings;
}

export function evaluateCompliance(input) {
  const { persona, issueId, mode, scope = "auto", changedPaths = null } = input;
  const violations = [];
  const taskboardOk = input.taskboardOk ?? false;
  const issue = input.issue ?? null;
  const session = input.session ?? null;
  const workflow = input.workflow ?? loadWorkflowState(persona, issueId);
  const dialogue = input.dialogue ?? dialogueForIssue(issueId, persona);
  const checklist = workflow.checklist ?? {};
  const gateHandoff = Boolean(input.gateHandoff);

  const fix = (cmd) => cmd;

  const routing = resolveTaskboardRouting({ scope, issueId, issue, changedPaths });
  violations.push(
    ...evaluateTaskboardViolations({
      issueId,
      issue,
      persona,
      mode,
      taskboardOk,
      gateHandoff,
      requireClaim: true,
      scope,
      changedPaths,
    }),
  );

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
    violations.push(...evaluateCrossChatClaimConflicts(persona, issueId, session));
    violations.push(...evaluateIssueLockHeld(issueId, session));
    violations.push(...evaluateExecutorCriticPairing(persona, issueId, session, mode));
    const warnings = [
    ...evaluateDelegationFeedbackWarnings(persona, issueId, session, issue),
    ...evaluateToolingWarnings(),
    ...evaluateDialogueDisplayWarnings(),
    ...evaluateCoordinatorMonologueWarnings(persona),
    ...evaluateHierarchyProxyAnswerWarnings(persona),
    ...evaluatePersonaRoboticWarnings(readPendingBroadcastText()),
    ...evaluatePersonaIdentityWarnings(readPendingBroadcastText(), persona),
    ...evaluateActivePersonaWarnings(session),
    ...(issueId && issue?.status === "in_progress"
      ? evaluateTeamInteractionWarnings(issueId)
      : []),
    ...evaluateCenterBypassWarnings(issueId),
    ...evaluateOrchestratorCriticPairing(persona, issueId),
    ...evaluateBrainConsultationWarnings({ persona, mode, issue }),
    ...evaluateReflectionPendingWarnings({ persona, mode, issue, issueId }),
    ...evaluateCapabilitiesUnderusedWarnings({ persona, mode, issueId, session }),
    ...evaluateDispatchPendingWarnings(persona),
  ];
    const reminders = getComplianceReminders({ persona, mode });
    return { compliant: violations.length === 0, violations, warnings, reminders, mode, persona, issueId, routing };
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

  let warnings = [
    ...evaluateDoneWithReservationsWarnings(issue, input.comments ?? []),
    ...evaluateDelegationFeedbackWarnings(persona, issueId, session, issue),
    ...evaluateToolingWarnings(),
    ...evaluateDialogueDisplayWarnings(),
    ...evaluateCoordinatorMonologueWarnings(persona),
    ...evaluateHierarchyProxyAnswerWarnings(persona),
    ...evaluatePersonaRoboticWarnings(readPendingBroadcastText()),
    ...evaluatePersonaIdentityWarnings(readPendingBroadcastText(), persona),
    ...evaluateActivePersonaWarnings(session),
    ...(issueId && issue?.status === "in_progress"
      ? evaluateTeamInteractionWarnings(issueId)
      : []),
    ...evaluateBrainConsultationWarnings({ persona, mode, issue }),
    ...evaluateReflectionPendingWarnings({ persona, mode, issue, issueId }),
    ...evaluateCapabilitiesUnderusedWarnings({ persona, mode, issueId, session }),
    ...evaluateDispatchPendingWarnings(persona),
  ];
  warnings = filterDialogueDisplayWarningsForMode(warnings, mode, violations);
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
    routing,
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
    gateHandoff: detectGateHandoff(),
  });
}

export function inferPersonaFromSessions(issueId) {
  const store = loadSessions();
  for (const session of Object.values(store.sessions)) {
    if (session.issueId === issueId) return session.persona;
  }
  return process.env.DIALOGUE_FROM_PERSONA ?? process.env.PROACTIVE_PERSONA ?? "orchestrator";
}
