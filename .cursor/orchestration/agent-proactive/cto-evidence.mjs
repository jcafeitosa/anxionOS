/**
 * Avaliação compartilhada de evidências CTO (G7 e decisões operacionais).
 * Consumido por cto-accept.mjs e cto-decide.mjs.
 */

import { execFileSync } from "node:child_process";
import { readDialogueMessages } from "../agent-dialogue/dialogue-log.mjs";
import { getCodeRoots, getKnowledgeRoot } from "../agent-config/load-config.mjs";

const GATE_RE =
  /\bG([2-6])\b(?![-A-Za-z0-9]).*\b(BLOCKED|PASS_WITH_CONDITIONS|PASS|CHANGES_REQUIRED|NOT_APPLICABLE)\b/gi;
const ORACLE_RE =
  /(bun test|boundaries|test:boundary|npm run boundaries)[^\n]*(\d+\/\d+|0 viol|PASS|pass)/gi;
const CRITIC_PASS_RE = /\b(critic|crític|G1).*PASS\b/i;
const G6_PASS_RE = /G6[^\n]{0,80}(PASS_WITH_CONDITIONS|PASS)/i;
const G6_INTEGRATED_RE = /disposi[cç][aã]o integrada[^\n]*(PASS_WITH_CONDITIONS|PASS)/i;
const VERDICT_VALUES = ["BLOCKED", "PASS_WITH_CONDITIONS", "PASS", "CHANGES_REQUIRED", "NOT_APPLICABLE"];
const VERDICT_ALT = VERDICT_VALUES.join("|");


const RESERVATIONS_RE = /\b(COM\s+RESSALVAS|done\s+com\s+ressalvas|ressalvas\s+(permanecem|pendentes)|MEDIUM\s+pendente|follow-?up\s+(MEDIUM|aberto))/i;
const OPEN_FOLLOWUP_RE = /\bANX-\d{2,}\b[^\n]{0,120}\b(todo|in_progress|blocked)\b/i;

export function detectReservationsInCorpus(corpus) {
  if (/\b(ressalvas cleared|zero ressalvas|sem ressalvas|nenhuma ressalva|filhos resolvidos)\b/i.test(corpus)) {
    return [];
  }
  const hits = [];
  if (RESERVATIONS_RE.test(corpus)) hits.push("Comentário menciona ressalvas ou MEDIUM pendente");
  if (OPEN_FOLLOWUP_RE.test(corpus)) hits.push("Follow-up ANX-* ainda aberto mencionado nos comentários");
  return hits;
}

const ESCALATE_PATTERNS = [
  { re: /\bADR\s*conflict|conflito.*ADR/i, reason: "Conflito ADR arquitetural" },
  { re: /TODO\(|FIXME|not implemented|placeholder.*prod/i, reason: "Violação tolerância zero no diff" },
];

function buildDocRe() {
  const root = getKnowledgeRoot().replace(/\/$/, "");
  const rootPattern = root.replace(/\//g, "\\/");
  return new RegExp(`(${rootPattern}/|AGENTS\\.md|ADR000\\d|0002-adopt-modular)`, "i");
}

function buildFilesRe() {
  const roots = getCodeRoots();
  const parts = roots.map((r) => r.replace(/\/$/, "").replace(/\//g, "\\/"));
  const rootsPattern = parts.length ? parts.join("|") : "src";
  return new RegExp(`(${rootsPattern}/|manifest|paths?|arquivos?|\\.ts)`, "i");
}

/** Última disposição por gate (G2–G6), mais recente primeiro — ignora achados tipo G4-SEC-02. */
export function extractLatestGateVerdicts(comments) {
  const verdicts = {};
  for (const c of [...comments].reverse()) {
    const text = `${c.title ?? ""}\n${c.body ?? ""}`;

    const dispoRe = new RegExp(
      `\\*\\*Gate:\\*\\*\\s*G([2-6])(?![-A-Za-z0-9])[^\\n]*\\n[^\\n]*\\*\\*Disposi[cç][aã]o:\\*\\*\\s*\\*\\*(${VERDICT_ALT})\\*\\*`,
      "gi",
    );
    let m;
    while ((m = dispoRe.exec(text)) !== null) {
      const gate = `G${m[1]}`;
      if (!verdicts[gate]) verdicts[gate] = m[2].toUpperCase();
    }

    const tableRe = new RegExp(`\\|\\s*G([2-6])\\s*\\|\\s*(${VERDICT_ALT})`, "gi");
    while ((m = tableRe.exec(text)) !== null) {
      const gate = `G${m[1]}`;
      if (!verdicts[gate]) verdicts[gate] = m[2].toUpperCase();
    }

    const headerMatch = text.match(/^##\s*G([2-6])(?![-A-Za-z0-9])\s+.*EXECUTED/im);
    if (headerMatch) {
      const gate = `G${headerMatch[1]}`;
      const dispo = text.match(
        new RegExp(`\\*\\*Disposi[cç][aã]o:\\*\\*\\s*\\*\\*(${VERDICT_ALT})\\*\\*`, "i"),
      );
      if (dispo && !verdicts[gate]) verdicts[gate] = dispo[1].toUpperCase();
    }
  }
  return verdicts;
}

function mergeDialogueGateVerdicts(issueId, verdicts) {
  const merged = { ...verdicts };
  const messages = readDialogueMessages({ issueId });
  for (const m of [...messages].reverse()) {
    if (!m.gate || merged[m.gate] || !/^G[2-6]$/.test(m.gate) || m.type !== "verdict") continue;
    if (m.verdict && VERDICT_VALUES.includes(m.verdict)) {
      merged[m.gate] = m.verdict;
      continue;
    }
    const bodyMatch = m.body?.match(
      new RegExp(`(?:Verdict|Disposi[cç][aã]o):\\s*\\*\\*?(${VERDICT_ALT})\\*\\*?`, "i"),
    );
    if (bodyMatch && m.type === "verdict") merged[m.gate] = bodyMatch[1].toUpperCase();
  }
  return merged;
}

function checkEscalationTriggers(comments, issueId) {
  const recentVerdicts = mergeDialogueGateVerdicts(issueId, extractLatestGateVerdicts(comments.slice(-5)));
  const reasons = [];
  if (recentVerdicts.G5 === "BLOCKED" || recentVerdicts.G5 === "CHANGES_REQUIRED") {
    reasons.push("Red Team G5 BLOCKED (comentário recente)");
  }
  if (recentVerdicts.G4 === "BLOCKED" || recentVerdicts.G4 === "CHANGES_REQUIRED") {
    reasons.push("Security G4 BLOCKED (comentário recente)");
  }
  return reasons;
}

export function checkGitEvidence(root) {
  const passed = [];
  const reasons = [];
  const warnings = [];
  let srcTracked = 0;
  let distTracked = 0;
  let stagedSrc = 0;
  const codeRoots = getCodeRoots();

  for (const codeRoot of codeRoots) {
    const normalized = codeRoot.replace(/\/$/, "");
    try {
      srcTracked += execFileSync("git", ["ls-files", normalized], { cwd: root, encoding: "utf8" })
        .split("\n")
        .filter((p) => /\/src\/.*\.ts$/.test(p)).length;
      distTracked += execFileSync("git", ["ls-files", normalized], { cwd: root, encoding: "utf8" })
        .split("\n")
        .filter((p) => /\/dist\//.test(p)).length;
      stagedSrc += execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: root, encoding: "utf8" })
        .split("\n")
        .filter((p) => p.startsWith(`${normalized}/`) && /\/src\/.*\.ts$/.test(p)).length;
    } catch (err) {
      warnings.push(`Git evidence parcial (${normalized}): ${err.message}`);
    }
  }

  if (distTracked > 0) reasons.push(`${distTracked} arquivo(s) dist/ rastreado(s) em codeRoots`);
  else passed.push("Zero dist/ rastreado em codeRoots");

  if (srcTracked + stagedSrc === 0) reasons.push("Nenhum src/**/*.ts em codeRoots (tracked ou staged)");
  else passed.push(`Src modules: ${srcTracked} tracked + ${stagedSrc} staged .ts`);

  return { passed, reasons, warnings, srcTracked, stagedSrc, distTracked };
}

export function checkDialogue(issueId) {
  const messages = readDialogueMessages({ issueId });
  const handoff = messages.some((m) => m.type === "handoff");
  const verdictPass = messages.some((m) => m.type === "verdict" && m.verdict === "PASS");
  const decisionPass = messages.some(
    (m) => m.type === "decision" && (m.verdict === "PASS" || m.decision?.chosen === "aceitar"),
  );
  const criticVerdictPass = messages.some(
    (m) => m.type === "verdict" && m.verdict === "PASS" && (m.gate === "G1" || m.from.role === "critic"),
  );
  return { messages, handoff, verdictPass, decisionPass, criticVerdictPass };
}

export function checkAcceptanceCriteria(description) {
  const unchecked = (description.match(/- \[ \]/g) ?? []).length;
  const checked = (description.match(/- \[x\]/gi) ?? []).length;
  return { unchecked, checked, open: unchecked > 0 };
}

function checkGateBlockers(comments, latestCorpus, issueId) {
  const g6Integrated = G6_PASS_RE.test(latestCorpus) || G6_INTEGRATED_RE.test(latestCorpus);
  if (g6Integrated) return { blockedGates: [], g6Integrated: true, verdicts: {} };
  const verdicts = mergeDialogueGateVerdicts(issueId, extractLatestGateVerdicts(comments));
  const blockedGates = Object.entries(verdicts)
    .filter(([, v]) => v === "BLOCKED" || v === "CHANGES_REQUIRED")
    .map(([g]) => g);
  return { blockedGates, g6Integrated: false, verdicts };
}

export function evaluateEvidence(issueId, task, comments, root) {
  const corpus = comments.map((c) => `${c.title ?? ""}\n${c.body ?? ""}`).join("\n---\n");
  const latestCorpus = comments.slice(-5).map((c) => `${c.title ?? ""}\n${c.body ?? ""}`).join("\n---\n");
  const dialogue = checkDialogue(issueId);
  const criteria = checkAcceptanceCriteria(task.description ?? "");
  const git = checkGitEvidence(root);
  const reasons = [];
  const warnings = [...git.warnings];
  const passed = [...git.passed];
  const DOC_RE = buildDocRe();
  const FILES_RE = buildFilesRe();

  if (task.status === "done") passed.push("Issue já done — decisão G7 aplicada");
  else if (task.status !== "in_review") reasons.push(`Status ${task.status} — esperado in_review para G7`);
  else passed.push("Issue em in_review");

  if (!DOC_RE.test(corpus) && !DOC_RE.test(task.description ?? "")) reasons.push("Referência doc ausente nos comentários");
  else passed.push("Referência documental presente");

  if (!FILES_RE.test(corpus) && git.srcTracked + git.stagedSrc === 0) reasons.push("Manifest ausente");
  else passed.push("Arquivos/manifest referenciados ou verificados via git");

  if (!ORACLE_RE.test(corpus)) reasons.push("Oráculos ausentes nos comentários");
  else passed.push("Oráculos documentados nos comentários");

  const criticInComments = CRITIC_PASS_RE.test(corpus);
  if (!dialogue.criticVerdictPass && !criticInComments) reasons.push("Crítico G1 PASS ausente");
  else passed.push("Crítico G1 PASS documentado");

  const { blockedGates, g6Integrated } = checkGateBlockers(comments, latestCorpus, issueId);
  if (blockedGates.length > 0) reasons.push(`Gates BLOCKED nos comentários: ${blockedGates.join(", ")}`);
  else if (g6Integrated) passed.push("G6 integrado PASS/PASS_WITH_CONDITIONS");
  else {
    const gateHits = corpus.match(GATE_RE) ?? [];
    if (gateHits.length === 0) warnings.push("Nenhum gate G2–G6 EXECUTED explícito");
    else passed.push(`Gates G2–G6 referenciados (${gateHits.length} menções)`);
  }

  if (dialogue.handoff) passed.push("Dialogue contém handoff");
  else warnings.push("Dialogue sem handoff formal");

  if (dialogue.verdictPass || dialogue.decisionPass) passed.push("Dialogue contém verdict/decision PASS");
  else warnings.push("Dialogue sem verdict/decision PASS (CTO registra agora)");

  if (criteria.open) warnings.push(`Critérios abertos na descrição (${criteria.unchecked} [ ])`);
  else if (criteria.checked > 0) passed.push("Critérios marcados na descrição");

  const uncommittedNote = /não commitado|not committed|ainda não commit|uncommitted|HEAD observado.*não commit/i.test(latestCorpus);
  if (uncommittedNote && git.stagedSrc === 0 && git.srcTracked === 0) reasons.push("Deliverable não commitado e sem src staged");
  else if (uncommittedNote && git.stagedSrc > 0) {
    warnings.push("Deliverable staged — commit gate pendente");
    passed.push("Src staged pronto para commit gate");
  }

  const escalateReasons = checkEscalationTriggers(comments, issueId);
  for (const pat of ESCALATE_PATTERNS) {
    if (pat.re.test(latestCorpus)) escalateReasons.push(pat.reason);
  }
  if (escalateReasons.length > 0) {
    return {
      decision: "ESCALATE_TO_OWNER",
      reasons: [...new Set(escalateReasons), ...reasons],
      warnings,
      passed,
      dialogue,
      criteria,
      git,
    };
  }

  const reservationHits = detectReservationsInCorpus(latestCorpus);
  if (reservationHits.length > 0) {
    reasons.push(`DONE_WITH_RESERVATIONS: ${reservationHits.join('; ')}`);
  }

  if (/fora do escopo|out of scope|scope creep/i.test(latestCorpus)) reasons.push("Alterações fora do escopo (comentário recente)");

  if (reasons.length > 0) return { decision: "CHANGES_REQUIRED", reasons, warnings, passed, dialogue, criteria, git };
  return { decision: "ACCEPT", reasons: [], warnings, passed, dialogue, criteria, git };
}

export function decisionToVerdict(result) {
  if (result.decision === "ACCEPT") return "PASS";
  if (result.decision === "ESCALATE_TO_OWNER") return "BLOCKED";
  return "CHANGES_REQUIRED";
}
