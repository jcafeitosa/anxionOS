/**
 * Árvore de decisão por persona — sugere próxima ação a partir do estado + sinais externos.
 */

import { getPersona } from "../agent-dialogue/personas.mjs";
import { GATE_LEAD_MAP, LEVEL_C } from "../agent-hire/levels.mjs";
import { loadWorkflowState, SILENCE_THRESHOLD_MS } from "./state.mjs";

const EXECUTOR_STEPS = [
  "pre-work-g0",
  "ack-delegation",
  "implement",
  "verify-oracles",
  "handoff-critic",
  "await-g2",
  "fix-changes",
  "done-g7",
];

const CRITIC_STEPS = [
  "await-handoff",
  "review-diff",
  "challenge-findings",
  "verdict-pass",
  "verdict-changes",
];

/**
 * @param {string} persona
 * @param {string} issueId
 * @param {object} [signals]
 * @returns {object}
 */
export function suggestNextAction(persona, issueId, signals = {}) {
  const state = loadWorkflowState(persona, issueId);
  const p = getPersona(persona);
  const role = p.role;

  if (role === "orchestrator") return nextOrchestrator(state, signals);
  if (role === "architect") return nextArchitect(state, signals);
  if (role === "researcher") return nextResearcher(state, signals);
  if (role === "executor") return nextExecutor(state, signals, p);
  if (persona === "cto-critic") return nextCtoCritic(state, signals);
  if (role === "critic") return nextCritic(state, signals, p);
  if (GATE_LEAD_MAP[persona]) return nextGateLead(persona, state, signals);
  if (role === "github") return nextGithubLead(state, signals);
  if (role === "docs") return nextDocsLead(state, signals);

  return {
    action: "consult-workflow-doc",
    reason: "Persona sem árvore dedicada — ver workflows/workflow-{persona}.md",
    step: state.step,
  };
}

function staleDialogue(checklist) {
  if (!checklist.lastDialogueAt) return true;
  const age = Date.now() - new Date(checklist.lastDialogueAt).getTime();
  return age > SILENCE_THRESHOLD_MS;
}

function nextOrchestrator(state, signals) {
  if (!signals.taskboardOnline) {
    return { action: "abort-work", reason: "taskboard offline", step: "monitor-board", command: "npm run taskboard:ensure" };
  }
  if (signals.issueStatus === "in_review" && signals.allGatesPass) {
    return {
      action: "cto-accept",
      reason: "G2–G6 PASS — avaliar aceite G7",
      step: "g7-decide",
      command: `npm run orchestration:cto-accept -- --issue ${state.issueId}`,
      dialogueType: "decision",
    };
  }
  if (signals.issueStatus === "in_progress" && !signals.g1Pass) {
    return {
      action: "monitor-g1",
      reason: "Aguardar executor+crítico concluir G1",
      step: "monitor-g1",
      dialogueType: "status",
    };
  }
  if (signals.blockedCycles >= 3) {
    return {
      action: "escalate-owner",
      reason: "Impasse após 3 ciclos",
      step: "escalate",
      dialogueType: "escalate",
      escalateTo: "owner",
    };
  }
  return {
    action: "dispatch-g0",
    reason: "Verificar pacote G0 e despachar par executor+crítico",
    step: "dispatch",
    command: "npm run taskboard:list",
    dialogueType: "handoff",
  };
}

function nextArchitect(state, signals) {
  if (signals.consultPending) {
    return {
      action: "respond-consult",
      reason: "Consulta ADR/boundaries pendente",
      step: "consult",
      dialogueType: "consult",
    };
  }
  return {
    action: "standby",
    reason: "Aguardar @consult ou debate estrutural",
    step: "standby-consult",
  };
}

function nextResearcher(state, signals) {
  if (signals.researchRequested) {
    return {
      action: "execute-spike",
      reason: "Spike delegado — pesquisar com fontes",
      step: "research",
      dialogueType: "research",
      command: "OpenKnowledge search + share",
    };
  }
  return { action: "standby", reason: "Aguardar delegação de spike", step: "standby-research" };
}

function nextExecutor(state, signals, persona) {
  const critic = persona.criticSlug;
  const c = state.checklist;

  if (!c.agentsMdRead || !c.taskboardEnsure) {
    return {
      action: "complete-g0",
      reason: "G0 incompleto — AGENTS.md + taskboard:ensure + pacote issue",
      step: "pre-work-g0",
      command: "npm run taskboard:prework",
    };
  }
  if (!c.sessionStarted) {
    return {
      action: "start-session",
      reason: "Sessão No Silent Work não iniciada",
      step: "ack-delegation",
      command: `npm run orchestration:session -- start --persona ${state.persona} --issue ${state.issueId}`,
      dialogueType: "ack",
    };
  }
  if (!c.ackPosted) {
    return {
      action: "post-ack",
      reason: "Delegação recebida — publicar ack",
      step: "ack-delegation",
      dialogueType: "ack",
      handoffTo: critic,
    };
  }
  if (staleDialogue(c) && signals.issueStatus === "in_progress") {
    return {
      action: "post-status",
      reason: ">10min sem dialogue — silence-watch",
      step: "implement",
      dialogueType: "status",
      command: `npm run orchestration:broadcast -- --from-persona ${state.persona} --type status --issue ${state.issueId}`,
    };
  }
  if (signals.oraclesPass && !signals.g1Pass) {
    return {
      action: "handoff-critic",
      reason: "Implementação verificada — handoff G1",
      step: "handoff-critic",
      dialogueType: "handoff",
      handoffTo: critic,
      command: `node scripts/taskboard.mjs move ${state.issueId} in_review`,
    };
  }
  if (signals.g1ChangesRequired) {
    return {
      action: "fix-and-reverify",
      reason: "Crítico CHANGES_REQUIRED — corrigir e revalidar",
      step: "fix-changes",
      dialogueType: "response",
    };
  }
  if (signals.blocked) {
    return {
      action: "hire-worker-or-escalate",
      reason: "Bloqueio detectado",
      step: "blocked",
      dialogueType: "escalate",
      escalateTo: "gate-lead-or-orchestrator",
    };
  }
  return {
    action: "implement",
    reason: "Continuar implementação com status periódico",
    step: "implement",
    dialogueType: "status",
  };
}

function nextCtoCritic(state, signals) {
  if (!signals.taskboardOnline) {
    return {
      action: "abort-work",
      reason: "taskboard offline",
      step: "monitor-board",
      command: "npm run taskboard:ensure",
    };
  }
  const sessionReady =
    state.checklist?.sessionStarted || signals.sessionStarted || signals.sessionActive;
  if (!sessionReady) {
    return {
      action: "start-session",
      reason: "Sessão No Silent Work não iniciada",
      step: "governance-audit",
      command: `npm run orchestration:session -- start --persona cto-critic --issue ${state.issueId}`,
      dialogueType: "ack",
    };
  }
  if (signals.issueStatus === "in_review" && signals.allGatesPass) {
    return {
      action: "audit-g7-package",
      reason: "G2–G6 PASS — auditar evidências G7 antes de aceite",
      step: "g7-audit",
      command: `npm run orchestration:cto-decide -- --issue ${state.issueId}`,
      dialogueType: "consult",
      handoffTo: "orchestrator",
    };
  }
  if (staleDialogue(state.checklist)) {
    return {
      action: "delegate-monitor",
      reason: "Monitorar delegações stale e hires sem evidência",
      step: "governance-audit",
      command: "npm run orchestration:delegate-monitor -- list",
      dialogueType: "status",
    };
  }
  return {
    action: "challenge-governance",
    reason: "Auditar handoffs, hires e pacote G6",
    step: "governance-audit",
    dialogueType: "challenge",
    handoffTo: "orchestrator",
  };
}

function nextCritic(state, signals, persona) {
  const executor = persona.criticOf;
  if (!signals.handoffReceived) {
    return {
      action: "await-handoff",
      reason: `Aguardar handoff de ${executor}`,
      step: "await-handoff",
    };
  }
  if (!signals.verdictPosted) {
    return {
      action: "review-and-verdict",
      reason: "Revisar diff + zero tolerância → verdict G1",
      step: "review-diff",
      dialogueType: "verdict",
      handoffTo: executor,
    };
  }
  if (signals.verdict === "PASS") {
    return {
      action: "notify-g2",
      reason: "G1 PASS — notificar code-review-lead",
      step: "verdict-pass",
      dialogueType: "handoff",
      handoffTo: "code-review-lead",
    };
  }
  return {
    action: "return-to-executor",
    reason: "CHANGES_REQUIRED — executor corrige",
    step: "verdict-changes",
    dialogueType: "verdict",
    handoffTo: executor,
  };
}

function nextGateLead(persona, state, signals) {
  const gate = GATE_LEAD_MAP[persona];
  if (!signals.handoffReceived) {
    return {
      action: "await-handoff",
      reason: `Aguardar handoff ${gate} predecessor`,
      step: "await-handoff",
    };
  }
  if (!signals.verdictPosted) {
    return {
      action: "execute-gate-review",
      reason: `Executar revisão ${gate}`,
      step: `review-${gate.toLowerCase()}`,
      dialogueType: "verdict",
    };
  }
  return {
    action: "handoff-next-gate",
    reason: `${gate} PASS — handoff próximo gate`,
    step: "handoff-next",
    dialogueType: "handoff",
  };
}

function nextGithubLead(state, signals) {
  if (signals.prReady && signals.ciGreen) {
    return { action: "merge-readiness", reason: "PR+CI OK — pronto G7", step: "merge-ready", dialogueType: "status" };
  }
  if (signals.ciFailed) {
    return {
      action: "investigate-ci",
      reason: "CI falhou — ci-investigator ou executor",
      step: "ci-fix",
      dialogueType: "escalate",
    };
  }
  return { action: "await-pr", reason: "Aguardar PR com ANX-*", step: "await-pr" };
}

function nextDocsLead(state, signals) {
  if (signals.behaviorChanged) {
    return {
      action: "update-docs",
      reason: "Comportamento alterado — atualizar docs/",
      step: "update-docs",
      dialogueType: "share",
    };
  }
  return { action: "standby", reason: "Aguardar handoff documental", step: "await-handoff" };
}

export { EXECUTOR_STEPS, CRITIC_STEPS, LEVEL_C };
