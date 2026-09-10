/**
 * OpenKnowledge brain loop — staging reflections + compliance heuristics.
 * Material lessons must be promoted to brain/ via open-knowledge MCP.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getOrchestrationPaths } from "../agent-config/load-config.mjs";
import { readDialogueMessages } from "../agent-dialogue/dialogue-log.mjs";

export const REFLECTIONS_FILENAME = "brain-reflections.jsonl";

const BRAIN_REFERENCE_RE =
  /\b(?:brain\/|open-knowledge|openknowledge|okf\b|pacote g0|source:\s*brain|fonte.*brain\/|spec\.md|project-docs\/(?:specs|decisions))/i;

const CHANGES_REQUIRED_RE = /\bCHANGES_REQUIRED\b/i;

export function reflectionsPath(options = {}) {
  const runtime = options.runtimeRoot ?? getOrchestrationPaths(options).paths.runtime;
  return join(runtime, REFLECTIONS_FILENAME);
}

export function isExecutorLike(persona) {
  if (!persona) return false;
  return persona.endsWith("-executor") || persona === "generalPurpose";
}

export function hasBrainReference(text) {
  if (!text || typeof text !== "string") return false;
  return BRAIN_REFERENCE_RE.test(text);
}

export function extractIssueBrainContext(issue) {
  if (!issue) return "";
  const parts = [];
  const task = issue.task ?? issue;
  if (typeof task.description === "string") parts.push(task.description);
  if (typeof issue.description === "string") parts.push(issue.description);
  if (Array.isArray(issue.comments)) {
    for (const c of issue.comments) {
      if (typeof c.body === "string") parts.push(c.body);
      if (typeof c.text === "string") parts.push(c.text);
    }
  }
  return parts.join("\n");
}

export function appendReflection(entry, options = {}) {
  const path = reflectionsPath(options);
  mkdirSync(dirname(path), { recursive: true });
  const record = {
    ts: new Date().toISOString(),
    issueId: entry.issueId,
    outcome: entry.outcome,
    lesson: entry.lesson,
    persona: entry.persona ?? process.env.DIALOGUE_FROM_PERSONA ?? null,
    gate: entry.gate ?? null,
    promoted: Boolean(entry.promoted),
    brainPath: entry.brainPath ?? null,
    stagingPath: path,
    promoteHint:
      "Promover lição material via open-knowledge MCP write/edit em brain/notes/ ou checkpoint — ver OPENKNOWLEDGE-BRAIN.md",
  };
  appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export function listReflections(filter = {}, options = {}) {
  const path = reflectionsPath(options);
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const rows = [];
  for (const line of lines) {
    try {
      rows.push(JSON.parse(line));
    } catch {
      // skip malformed
    }
  }
  if (filter.issueId) {
    return rows.filter((r) => r.issueId === filter.issueId);
  }
  return rows;
}

export function issueHasReflection(issueId, options = {}) {
  return listReflections({ issueId }, options).length > 0;
}

export function evaluateBrainConsultationWarnings({ persona, mode, issue }) {
  const warnings = [];
  if (mode !== "pre-work") return warnings;
  if (!isExecutorLike(persona)) return warnings;

  const context = extractIssueBrainContext(issue);
  if (hasBrainReference(context)) return warnings;

  warnings.push({
    code: "BRAIN_NOT_CONSULTED",
    message:
      "Issue sem referencia brain/spec no pacote G0 (descricao/comentarios) — consultar open-knowledge MCP antes de codar",
    fix:
      'open-knowledge search + exec("cat brain/…"); registrar fonte na issue; ver OPENKNOWLEDGE-BRAIN.md',
  });
  return warnings;
}

export function evaluateReflectionPendingWarnings({ persona, mode, issue, issueId }) {
  const warnings = [];
  if (!issueId) return warnings;
  if (mode !== "pre-commit" && mode !== "full") return warnings;

  const status = issue?.status ?? issue?.task?.status;
  if (status !== "in_review") return warnings;

  const messages = readDialogueMessages().filter((m) => m.issueId === issueId);
  const hadChangesRequired = messages.some(
    (m) =>
      CHANGES_REQUIRED_RE.test(m.body ?? "") ||
      CHANGES_REQUIRED_RE.test(m.evidence ?? "") ||
      (m.type === "verdict" && /changes_required/i.test(m.body ?? "")),
  );
  if (!hadChangesRequired) return warnings;

  if (issueHasReflection(issueId)) return warnings;

  warnings.push({
    code: "REFLECTION_PENDING",
    message: `Issue ${issueId} em in_review apos ciclo CHANGES_REQUIRED sem reflexao em brain-reflections.jsonl`,
    fix: `npm run orchestration:brain -- reflect --issue ${issueId} --outcome fail --lesson "..." && promover via open-knowledge MCP`,
  });
  return warnings;
}

export function printSearchInstructions(query) {
  const q = query?.trim() || "";
  console.log(`OpenKnowledge brain search — use MCP (nao Read/Grep nativo em brain/)

Query: ${q || "(vazio)"}

Padrao recomendado (user-open-knowledge MCP):
  1. search({ query: "${q.replace(/"/g, '\\"')}" })
  2. exec("grep -rn \\"termo\\" brain/project-docs/specs | head -10")
  3. exec("cat brain/index.md")
  4. exec("ls -A brain/notes")

Antes de trabalho tecnico:
  - brain/index.md → spec/ADR/postmortem aplicavel
  - Registrar path + secao no comentario da issue (pacote G0)

Apos erro ou PASS com padrao novo:
  - npm run orchestration:brain -- reflect --issue ANX-N --outcome pass|fail --lesson "..."
  - Promover lição material: open-knowledge write/edit em brain/notes/

Docs: .cursor/orchestration/OPENKNOWLEDGE-BRAIN.md
Skill: .cursor/skills/open-knowledge/SKILL.md`);
}
