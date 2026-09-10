/**
 * Heurística suave: sessão ativa sem evidência de uso de capacidades (shell/MCP/rede).
 * Warn CAPABILITIES_UNDERUSED — ver AGENT-CAPABILITIES.md · Z19.
 */

import { readDialogueMessages } from "../agent-dialogue/dialogue-log.mjs";
import { isExecutorLike } from "../agent-brain/brain-reflection.mjs";

const CAPABILITY_EVIDENCE_RE =
  /(?:^|\s)(?:command|mcp|tool|web|url|https?):|(?:--evidence\b)|\b(?:graphify|supermemory|context7|open-knowledge|serena|chrome-devtools|playwright|WebFetch|WebSearch|npm run|bun test|taskboard:|npx -y)\b|https?:\/\//i;

const SUBSTANTIVE_SESSION_MS = 3 * 60 * 1000;

function messageHasCapabilityEvidence(message) {
  const corpus = [message?.body, message?.evidence, message?.text]
    .filter((s) => typeof s === "string")
    .join("\n");
  return CAPABILITY_EVIDENCE_RE.test(corpus);
}

function messagesSince(isoStart, issueId) {
  const startMs = Date.parse(isoStart);
  if (!Number.isFinite(startMs)) return [];
  return readDialogueMessages().filter((m) => {
    if (m.issueId !== issueId) return false;
    const ts = Date.parse(m.timestamp ?? m.createdAt ?? m.ts ?? "");
    return Number.isFinite(ts) && ts >= startMs;
  });
}

/**
 * @param {{ persona?: string, mode?: string, issueId?: string, session?: object|null }} input
 * @returns {{ code: string, message: string, fix: string }[]}
 */
export function evaluateCapabilitiesUnderusedWarnings({ persona, mode, issueId, session }) {
  const warnings = [];
  if (mode !== "pre-work" && mode !== "full") return warnings;
  if (!issueId || !session || session.issueId !== issueId) return warnings;
  if (!isExecutorLike(persona) && persona !== "orchestrator" && persona !== "researcher") {
    return warnings;
  }

  const startedAt = session.startedAt;
  if (!startedAt) return warnings;

  const ageMs = Date.now() - Date.parse(startedAt);
  if (!Number.isFinite(ageMs) || ageMs < SUBSTANTIVE_SESSION_MS) return warnings;

  const recent = messagesSince(startedAt, issueId);
  if (recent.length === 0) return warnings;

  const hasEvidence = recent.some(messageHasCapabilityEvidence);
  if (hasEvidence) return warnings;

  warnings.push({
    code: "CAPABILITIES_UNDERUSED",
    message:
      "Sessão ativa >3min sem evidência de shell, MCP ou pesquisa (internet/RAG) no dialogue desta issue",
    fix:
      "Executar comandos de verificação; usar MCPs (open-knowledge, graphify, context7, supermemory) ou WebSearch/WebFetch; registrar --evidence command:/mcp:/url: — ver AGENT-CAPABILITIES.md",
  });
  return warnings;
}
