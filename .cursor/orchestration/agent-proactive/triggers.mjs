/**
 * Definição e avaliação de triggers proativos contra board + dialogue.
 */

import { readDialogueMessages } from "../agent-dialogue/dialogue-log.mjs";
import { getPersona, PERSONAS } from "../agent-dialogue/personas.mjs";
import {
  pendingEscalationToTrigger,
  readPendingEscalation,
} from "../agent-autonomy/pending-escalate.mjs";
import { fetchBoardState, hoursSince, isUnblocked } from "./taskboard-fetch.mjs";

/**
 * @typedef {Object} TriggerResult
 * @property {string} id
 * @property {string} label
 * @property {string} severity
 * @property {string} whoActs
 * @property {string[]} personas
 * @property {string} summary
 * @property {string} recommendation
 * @property {string} actionKind
 * @property {string} [issueId]
 * @property {Object} [actPayload]
 * @property {Object} [meta]
 */

export const TRIGGER_DEFINITIONS = [
  { id: "issue-unblocked", label: "Issue desbloqueada em todo", whoActs: "Executor de domínio" },
  { id: "in-review-stale", label: "in_review sem atividade > 48h", whoActs: "Orquestrador" },
  { id: "in-progress-silent", label: "in_progress silencioso > 24h", whoActs: "Crítico do par" },
  { id: "taskboard-offline", label: "taskboard:ensure falhou", whoActs: "Qualquer agente" },
  { id: "dialogue-mention", label: "Nova menção @ no dialogue", whoActs: "Persona alvo" },
  { id: "ci-fail-branch", label: "CI falhou na branch ativa", whoActs: "GitHub Lead" },
  { id: "dependency-resolved", label: "Dependência upstream resolvida", whoActs: "Executor downstream" },
  { id: "zero-in-progress", label: "Nenhuma issue in_progress", whoActs: "Orquestrador" },
  { id: "g7-aceite-pending", label: "G7 pendente", whoActs: "Orquestrador" },
  { id: "specialist-in-review", label: "Issue entrou em in_review", whoActs: "Equipe especialista" },
  { id: "pending-escalate", label: "Escalação pendente (hook)", whoActs: "Orquestrador" },
];

const DOMAIN_PATTERNS = {
  "backend-executor": [/backend/i, /module/i, /packages/i, /phase-[2-9]/i, /P0[2-9]/i],
  "frontend-executor": [/frontend/i, /phase-7/i, /P07/i, /console/i],
  "infra-executor": [/\.github/i, /ci/i, /boundary/i, /phase-1/i, /P01/i, /deploy/i, /script/i],
  "adapters-executor": [/adapter/i, /connections/i, /phase-5/i, /gateway/i],
};

function mentionTargetsPersona(message, personaSlug) {
  const p = getPersona(personaSlug);
  const mention = `@${p.shortName.toLowerCase()}`;
  const body = message.body ?? "";
  const toMention = message.to?.mention ?? "";
  return body.includes(mention) || toMention === mention || body.includes(`@${p.slug}`);
}

function lastDialogueForIssue(issueId) {
  const msgs = readDialogueMessages({ issueId, newestFirst: true, limit: 1 });
  return msgs[0] ?? null;
}

function issueActivityAgeHours(task) {
  const lastMsg = lastDialogueForIssue(task.identifier);
  const activityAt = lastMsg?.timestamp ?? task.activityUpdatedAt ?? task.updatedAt;
  return hoursSince(activityAt);
}

/**
 * @param {string|null} personaSlug
 * @returns {Promise<TriggerResult[]>}
 */
export async function evaluateTriggers(personaSlug = null) {
  const board = await fetchBoardState();
  const tasks = board.tasks ?? [];
  /** @type {TriggerResult[]} */
  const results = [];

  const pendingEscalate = pendingEscalationToTrigger(readPendingEscalation());
  if (pendingEscalate) {
    results.push(pendingEscalate);
  }

  if (!board.online) {
    results.push({
      id: "taskboard-offline",
      label: "taskboard:ensure falhou",
      severity: "blocked",
      whoActs: "Qualquer agente",
      personas: Object.keys(PERSONAS),
      summary: `Taskboard offline: ${board.error ?? "health check failed"}`,
      recommendation: "PARAR trabalho técnico. Broadcast blocked + pedir Owner subir o serviço.",
      actionKind: "act-dialogue",
      actPayload: {
        type: "status",
        body: "⛔ Taskboard offline — trabalho técnico suspenso até `npm run taskboard:ensure` passar.",
      },
    });
    return filterByPersona(results, personaSlug);
  }

  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const inReview = tasks.filter((t) => t.status === "in_review");
  const todos = tasks.filter((t) => t.status === "todo");

  if (inProgress.length === 0) {
    results.push({
      id: "zero-in-progress",
      label: "Nenhuma issue in_progress",
      severity: "warn",
      whoActs: "Orquestrador",
      personas: ["orchestrator"],
      summary: `0 issues in_progress; ${inReview.length} in_review, ${todos.length} todo`,
      recommendation: "Escanear in_review (G7/G2–G6) e todo desbloqueadas; delegar ou escalar aceites.",
      actionKind: "suggest",
      meta: { inReviewCount: inReview.length, todoCount: todos.length },
    });
  }

  for (const task of inReview) {
    const staleH = issueActivityAgeHours(task);
    if (staleH >= 48) {
      results.push({
        id: "in-review-stale",
        label: "in_review sem atividade > 48h",
        severity: task.identifier === "ANX-221" ? "escalate" : "warn",
        whoActs: "Orquestrador",
        personas: ["orchestrator"],
        issueId: task.identifier,
        summary: `${task.identifier} in_review há ~${Math.round(staleH)}h sem diálogo/atividade`,
        recommendation:
          task.identifier === "ANX-221"
            ? "Escalar G7 para Owner — desbloqueia ANX-222 e cadeia P01."
            : "Escalar para Owner/revisor ou reconciliar gates pendentes.",
        actionKind: "act-dialogue",
        actPayload: {
          type: "escalate",
          gate: "G7",
          body: `@Owner — ${task.identifier} aguarda aceite G7 há ~${Math.round(staleH)}h. Pacote pronto; favor confirmar done ou CHANGES_REQUIRED.`,
          mirrorTaskboard: true,
        },
        meta: { staleHours: staleH, title: task.title },
      });
    }

    const g7Ready =
      /G7|aceite|owner/i.test(task.description ?? "") ||
      (task.conversationRefs ?? []).some((r) => /G7 READY|aceite/i.test(r.title ?? ""));
    if (g7Ready) {
      results.push({
        id: "g7-aceite-pending",
        label: "G7 pendente",
        severity: "escalate",
        whoActs: "Orquestrador",
        personas: ["orchestrator"],
        issueId: task.identifier,
        summary: `${task.identifier} parece pronta para aceite G7 (in_review)`,
        recommendation: "Postar escalate no dialogue + comentário @Owner no taskboard.",
        actionKind: "act-dialogue",
        actPayload: {
          type: "escalate",
          gate: "G7",
          body: `@Owner — candidato G7 para ${task.identifier}: "${task.title}". Gates G0–G6 documentados; aguardando aceite explícito.`,
          mirrorTaskboard: true,
        },
      });
    }

    results.push({
      id: "specialist-in-review",
      label: "Issue em in_review",
      severity: "info",
      whoActs: "Equipe especialista",
      personas: ["code-review-lead", "qa-lead", "security-lead", "red-team-lead"],
      issueId: task.identifier,
      summary: `${task.identifier} em in_review — verificar gates G2–G5 pendentes`,
      recommendation: "Voluntariar review se gate da sua equipe ainda não emitiu parecer.",
      actionKind: "suggest",
      meta: { title: task.title },
    });
  }

  for (const task of inProgress) {
    const silentH = issueActivityAgeHours(task);
    if (silentH >= 24) {
      results.push({
        id: "in-progress-silent",
        label: "in_progress silencioso > 24h",
        severity: "warn",
        whoActs: "Crítico do par",
        personas: ["backend-critic", "frontend-critic", "infra-critic", "adapters-critic"],
        issueId: task.identifier,
        summary: `${task.identifier} in_progress sem diálogo há ~${Math.round(silentH)}h`,
        recommendation: "Challenge/status request ao executor antes do handoff.",
        actionKind: "act-dialogue",
        actPayload: {
          type: "challenge",
          gate: "G1",
          body: `@executor — ${task.identifier} sem status há ~${Math.round(silentH)}h. Qual o bloqueio? Evidências parciais?`,
        },
        meta: { silentHours: silentH },
      });
    }
  }

  for (const task of todos) {
    if (!isUnblocked(task)) continue;

    results.push({
      id: "issue-unblocked",
      label: "Issue desbloqueada em todo",
      severity: "info",
      whoActs: "Executor de domínio",
      personas: ["backend-executor", "frontend-executor", "infra-executor", "adapters-executor"],
      issueId: task.identifier,
      summary: `${task.identifier} todo e desbloqueada: ${task.title}`,
      recommendation: "Pesquisar escopo, anunciar intenção no dialogue; claim só com delegação ou match de domínio.",
      actionKind: "suggest",
      meta: { title: task.title, labels: task.labels },
    });

    const blockersDone = (task.relations?.blockedBy ?? []).filter((b) => b.status === "done");
    if (blockersDone.length > 0) {
      results.push({
        id: "dependency-resolved",
        label: "Dependência upstream resolvida",
        severity: "info",
        whoActs: "Executor downstream",
        personas: ["backend-executor", "frontend-executor", "infra-executor", "adapters-executor"],
        issueId: task.identifier,
        summary: `${task.identifier} desbloqueada após ${blockersDone.map((b) => b.identifier).join(", ")} done`,
        recommendation: "Ack no dialogue + preparar claim (sem mover status sem thread binding).",
        actionKind: "suggest",
        meta: { resolvedBlockers: blockersDone.map((b) => b.identifier) },
      });
    }
  }

  const sinceIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const recentMessages = readDialogueMessages({ since: sinceIso });
  for (const msg of recentMessages) {
    for (const slug of Object.keys(PERSONAS)) {
      if (!mentionTargetsPersona(msg, slug)) continue;
      results.push({
        id: "dialogue-mention",
        label: "Menção @ no dialogue",
        severity: "info",
        whoActs: getPersona(slug).fullName,
        personas: [slug],
        issueId: msg.issueId ?? undefined,
        summary: `${getPersona(slug).shortName} mencionado em ${msg.type} (${msg.id.slice(0, 8)})`,
        recommendation: "Responder no próximo turno com replyTo.",
        actionKind: "suggest",
        meta: { messageId: msg.id, from: msg.from?.name },
      });
    }
  }

  if (process.env.CI_FAIL_BRANCH || process.env.GITHUB_CI_FAIL) {
    results.push({
      id: "ci-fail-branch",
      label: "CI falhou na branch",
      severity: "warn",
      whoActs: "GitHub Lead",
      personas: ["github-lead"],
      summary: `CI fail sinalizado: ${process.env.CI_FAIL_BRANCH ?? process.env.GITHUB_CI_FAIL}`,
      recommendation: "Postar verdict CHANGES_REQUIRED com link do check.",
      actionKind: "act-dialogue",
      actPayload: {
        type: "verdict",
        verdict: "CHANGES_REQUIRED",
        body: `CI falhou em ${process.env.CI_FAIL_BRANCH ?? "branch ativa"}. Ver checks antes de merge.`,
      },
    });
  }

  return filterByPersona(results, personaSlug);
}

function filterByPersona(results, personaSlug) {
  if (!personaSlug) return dedupeResults(results);
  return dedupeResults(results.filter((r) => r.personas.includes(personaSlug)));
}

function dedupeResults(results) {
  const seen = new Set();
  return results.filter((r) => {
    const key = `${r.id}:${r.issueId ?? ""}:${r.summary}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatTriggerResults(results, format = "text") {
  if (format === "json") return JSON.stringify(results, null, 2);
  if (results.length === 0) return "(nenhum trigger ativo)";
  return results
    .map((r) => {
      const issue = r.issueId ? ` · ${r.issueId}` : "";
      return `[${r.severity}] ${r.id}${issue}\n  ${r.summary}\n  → ${r.recommendation}`;
    })
    .join("\n\n");
}
