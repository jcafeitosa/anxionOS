#!/usr/bin/env node
/**
 * CLI de fase do ciclo de vida produto — P0 (brainstorm) → P7 (produção).
 *
 * Usage:
 *   node phase-check.mjs status --issue ANX-N [--json]
 *   node phase-check.mjs next --from brainstorm|P0 [--json]
 *   node phase-check.mjs gate P4 --issue ANX-N [--json]
 *   node phase-check.mjs set --issue ANX-N --phase P4 [--json]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ISSUE_ID_RE = /^ANX-\d+$/;

import { getOrchestrationPaths, repoRoot as configRepoRoot } from "../agent-config/load-config.mjs";

const moduleDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = configRepoRoot;
export const lifecycleDir = getOrchestrationPaths().paths.lifecycle;

/** @type {Record<string, object>} */
export const LIFECYCLE_PHASES = {
  P0: {
    code: "P0",
    slug: "brainstorm",
    name: "Brainstorm",
    gate: "G-B",
    owners: ["researcher", "architect"],
    ownerNames: "Helena Duarte + Marcus Chen",
    output: "Problem statement, opções, go/no-go",
    doc: ".cursor/orchestration/LIFECYCLE.md#p0--brainstorm",
  },
  P1: {
    code: "P1",
    slug: "discovery",
    name: "Discovery",
    gate: "G-D",
    owners: ["architect", "orchestrator"],
    ownerNames: "Marcus Chen + Renata Oliveira",
    output: "Design doc / PRD draft, candidatos ADR",
    doc: ".cursor/orchestration/LIFECYCLE.md#p1--discovery",
  },
  P2: {
    code: "P2",
    slug: "architecture",
    name: "Architecture",
    gate: "G-A",
    owners: ["architect"],
    ownerNames: "Marcus Chen",
    output: "ADR accepted, specs Archify, mapa de módulos",
    doc: ".cursor/orchestration/LIFECYCLE.md#p2--architecture",
  },
  P3: {
    code: "P3",
    slug: "planning",
    name: "Planning",
    gate: "G-P",
    owners: ["orchestrator"],
    ownerNames: "Renata Oliveira",
    output: "Issues ANX-* no taskboard, pacotes de delegação",
    doc: ".cursor/orchestration/LIFECYCLE.md#p3--planning",
  },
  P4: {
    code: "P4",
    slug: "development",
    name: "Development",
    gate: "G0-G7",
    owners: ["orchestrator"],
    ownerNames: "Executores + gates G0–G7",
    output: "Código mergeado, E2E comprovado",
    doc: ".cursor/orchestration/E2E-RUNBOOK.md",
    pipelineGates: ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"],
  },
  P5: {
    code: "P5",
    slug: "staging",
    name: "Staging",
    gate: "G-S",
    owners: ["infra-executor", "security-lead"],
    ownerNames: "Edu Santos + Isa Ribeiro",
    output: "Deploy staging, testes de integração",
    doc: ".cursor/orchestration/LIFECYCLE.md#p5--staging",
  },
  P6: {
    code: "P6",
    slug: "launch-review",
    name: "Launch Review",
    gate: "G-L",
    owners: ["orchestrator"],
    ownerNames: "Renata Oliveira + Owner",
    output: "Launch checklist, plano de rollback",
    doc: ".cursor/orchestration/LIFECYCLE.md#p6--launch-review",
  },
  P7: {
    code: "P7",
    slug: "production",
    name: "Production",
    gate: "G-Prod",
    owners: ["infra-executor", "orchestrator"],
    ownerNames: "Ju Costa + Renata Oliveira",
    output: "Deploy prod, observabilidade, template postmortem",
    doc: ".cursor/orchestration/LIFECYCLE.md#p7--production",
  },
};

export const PHASE_ORDER = ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7"];

const SLUG_TO_CODE = Object.fromEntries(
  Object.values(LIFECYCLE_PHASES).map((p) => [p.slug, p.code]),
);

export function ensureLifecycleDir() {
  if (!existsSync(lifecycleDir)) mkdirSync(lifecycleDir, { recursive: true });
}

export function lifecyclePath(issueId) {
  return join(lifecycleDir, `${issueId}.json`);
}

export function assertIssueId(issueId) {
  if (!issueId || !ISSUE_ID_RE.test(issueId)) {
    throw new Error("issue obrigatório no formato ANX-N");
  }
}

export function resolvePhaseCode(input) {
  if (!input) return null;
  const upper = String(input).toUpperCase();
  if (LIFECYCLE_PHASES[upper]) return upper;
  const slug = String(input).toLowerCase();
  return SLUG_TO_CODE[slug] ?? null;
}

/**
 * @param {string} issueId
 * @returns {object}
 */
export function createDefaultLifecycleState(issueId) {
  return {
    version: 1,
    issueId,
    phase: "P0",
    phaseSlug: "brainstorm",
    gate: "G-B",
    updatedAt: new Date().toISOString(),
    evidence: [],
    checklist: {},
    history: [],
  };
}

/**
 * @param {string} issueId
 * @returns {object}
 */
export function loadLifecycleState(issueId) {
  assertIssueId(issueId);
  ensureLifecycleDir();
  const path = lifecyclePath(issueId);
  if (!existsSync(path)) return createDefaultLifecycleState(issueId);
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    const phase = resolvePhaseCode(data.phase) ?? "P0";
    const meta = LIFECYCLE_PHASES[phase];
    return {
      ...createDefaultLifecycleState(issueId),
      ...data,
      phase,
      phaseSlug: meta.slug,
      gate: meta.gate,
    };
  } catch {
    return createDefaultLifecycleState(issueId);
  }
}

/**
 * @param {string} issueId
 * @param {object} patch
 * @returns {object}
 */
export function saveLifecycleState(issueId, patch = {}) {
  const current = loadLifecycleState(issueId);
  const phase = resolvePhaseCode(patch.phase ?? current.phase) ?? current.phase;
  const meta = LIFECYCLE_PHASES[phase];
  const historyEntry = patch.phase && patch.phase !== current.phase
    ? { from: current.phase, to: phase, at: new Date().toISOString() }
    : null;
  const next = {
    ...current,
    ...patch,
    phase,
    phaseSlug: meta.slug,
    gate: meta.gate,
    checklist: { ...current.checklist, ...(patch.checklist ?? {}) },
    evidence: patch.evidence ?? current.evidence,
    history: historyEntry ? [...(current.history ?? []), historyEntry] : current.history ?? [],
    updatedAt: new Date().toISOString(),
  };
  ensureLifecycleDir();
  writeFileSync(lifecyclePath(issueId), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

/**
 * @param {string} fromInput
 * @returns {{ phase: object, nextPhase: object|null, steps: string[] }}
 */
export function suggestNextSteps(fromInput) {
  const code = resolvePhaseCode(fromInput);
  if (!code) throw new Error(`Fase desconhecida: ${fromInput}. Use P0–P7 ou slug (brainstorm, discovery, …)`);
  const phase = LIFECYCLE_PHASES[code];
  const idx = PHASE_ORDER.indexOf(code);
  const nextCode = idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
  const nextPhase = nextCode ? LIFECYCLE_PHASES[nextCode] : null;
  const steps = buildStepsForPhase(code);
  return { phase, nextPhase, steps };
}

function buildStepsForPhase(code) {
  const map = {
    P0: [
      "npm run orchestration:speak -- --persona researcher --type research --issue ANX-N --body \"…\"",
      "Criar nota em brain/ via OpenKnowledge MCP (frame-a-proposal skill)",
      "Publicar share com opções + go/no-go no dialogue",
      "npm run orchestration:phase -- set --issue ANX-N --phase P1 (se go)",
    ],
    P1: [
      "Escrever spec em brain/project-docs/specs/ via OKF",
      "Rascunhar ADR candidato (status: proposed)",
      "Marcus consult + Renata valida escopo",
      "npm run orchestration:phase -- set --issue ANX-N --phase P2",
    ],
    P2: [
      "npm run archify:validate",
      "Marcus @consult — boundaries e ADR",
      "Aceitar ADR (status: accepted) + specs .archify/",
      "npm run orchestration:phase -- set --issue ANX-N --phase P3",
    ],
    P3: [
      "Criar issues ANX-* no taskboard (buscar duplicatas)",
      "Pacotes em .cursor/orchestration/delegation-queue/",
      "Renata handoff executor + crítico por issue",
      "npm run orchestration:phase -- set --issue ANX-N --phase P4",
    ],
    P4: [
      "Seguir .cursor/orchestration/E2E-RUNBOOK.md (G0→G7)",
      "npm run orchestration:compliance -- --pre-work --issue ANX-N --persona <slug>",
      "npm run orchestration:workflow -- next --persona <slug> --issue ANX-N",
      "G7 cto-accept → npm run orchestration:phase -- set --issue ANX-N --phase P5",
    ],
    P5: [
      "Deploy staging (Edu) + smoke integração",
      "Isa — security review em ambiente staging",
      "Evidências em comentário issue + dialogue status",
      "npm run orchestration:phase -- set --issue ANX-N --phase P6",
    ],
    P6: [
      "Launch checklist (Renata + @Owner)",
      "Plano de rollback documentado",
      "npm run orchestration:cto-decide -- --issue ANX-N",
      "npm run orchestration:phase -- set --issue ANX-N --phase P7",
    ],
    P7: [
      "Deploy produção (Ju) com observabilidade",
      "Monitorar SLOs pós-deploy",
      "write-a-postmortem skill se incidente",
      "Registrar done no taskboard com aceite Owner",
    ],
  };
  return map[code] ?? [];
}

/**
 * @param {string} phaseInput
 * @param {string} issueId
 * @returns {object}
 */
export function mapPhaseToGates(phaseInput, issueId) {
  const code = resolvePhaseCode(phaseInput);
  if (!code) throw new Error(`Fase desconhecida: ${phaseInput}`);
  const phase = LIFECYCLE_PHASES[code];
  const state = issueId ? loadLifecycleState(issueId) : null;
  const result = {
    phase: phase.code,
    phaseName: phase.name,
    lifecycleGate: phase.gate,
    issueId: issueId ?? null,
    persistedPhase: state?.phase ?? null,
    pipelineGates: phase.pipelineGates ?? null,
    mapping: null,
  };
  if (code === "P4") {
    result.mapping = {
      description: "P4 Development = pipeline G0–G7 existente",
      gates: phase.pipelineGates,
      runbook: ".cursor/orchestration/E2E-RUNBOOK.md",
      compliance: "npm run orchestration:compliance -- --pre-work --issue ANX-N --persona <slug>",
    };
  } else {
    result.mapping = {
      description: `Gate ${phase.gate} — ver BRAINSTORM-TO-PROD-RUNBOOK.md § ${phase.slug}`,
      preP4: code < "P4",
      requiresBrainDocs: ["P1", "P2", "P3"].includes(code),
    };
  }
  return result;
}

function parseArgs(argv) {
  const args = { cmd: argv[0], json: false, issue: null, from: null, phase: null, gate: null };
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--issue") args.issue = argv[++i];
    else if (a === "--from") args.from = argv[++i];
    else if (a === "--phase") args.phase = argv[++i];
    else if (a === "gate" && !args.gate && args.cmd === "gate") args.gate = argv[++i];
    else if (args.cmd === "gate" && !args.gate && /^P\d$/i.test(a)) args.gate = a;
  }
  if (args.cmd === "gate" && !args.gate) {
    const gateIdx = argv.indexOf("gate");
    if (gateIdx >= 0 && argv[gateIdx + 1]) args.gate = argv[gateIdx + 1];
  }
  return args;
}

function printOrJson(data, json) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (data.phaseTable) {
    console.log("\n| Fase | Código | Gate | Owner | Output |");
    console.log("| --- | --- | --- | --- | --- |");
    for (const p of Object.values(LIFECYCLE_PHASES)) {
      console.log(`| ${p.name} | ${p.code} | ${p.gate} | ${p.ownerNames} | ${p.output} |`);
    }
    return;
  }
  if (data.steps) {
    console.log(`\n## Próximos passos — ${data.phase.name} (${data.phase.code})`);
    for (const s of data.steps) console.log(`- ${s}`);
    if (data.nextPhase) {
      console.log(`\n→ Transição sugerida: ${data.phase.code} → ${data.nextPhase.code} (${data.nextPhase.name})`);
    }
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.cmd || args.cmd === "--help" || args.cmd === "-h") {
    console.log(`Usage:
  orchestration:phase status --issue ANX-N
  orchestration:phase next --from brainstorm|P0
  orchestration:phase gate P4 --issue ANX-N
  orchestration:phase set --issue ANX-N --phase P4`);
    process.exit(0);
  }

  try {
    if (args.cmd === "status") {
      assertIssueId(args.issue);
      const state = loadLifecycleState(args.issue);
      const meta = LIFECYCLE_PHASES[state.phase];
      const out = {
        issueId: args.issue,
        phase: state.phase,
        phaseSlug: state.phaseSlug,
        phaseName: meta.name,
        gate: state.gate,
        owners: meta.ownerNames,
        output: meta.output,
        updatedAt: state.updatedAt,
        doc: meta.doc,
        isDevelopment: state.phase === "P4",
        pipelineGates: meta.pipelineGates ?? null,
      };
      printOrJson(out, args.json);
      return;
    }

    if (args.cmd === "next") {
      const from = args.from ?? "brainstorm";
      const result = suggestNextSteps(from);
      printOrJson(result, args.json);
      return;
    }

    if (args.cmd === "gate") {
      const phaseInput = args.gate ?? args.phase;
      if (!phaseInput) throw new Error("gate requer fase (ex.: P4)");
      const result = mapPhaseToGates(phaseInput, args.issue);
      printOrJson(result, args.json);
      return;
    }

    if (args.cmd === "set") {
      assertIssueId(args.issue);
      if (!args.phase) throw new Error("--phase P0–P7 obrigatório");
      const code = resolvePhaseCode(args.phase);
      if (!code) throw new Error(`Fase inválida: ${args.phase}`);
      const state = saveLifecycleState(args.issue, { phase: code });
      printOrJson(state, args.json);
      return;
    }

    if (args.cmd === "table") {
      printOrJson({ phaseTable: true }, args.json);
      return;
    }

    throw new Error(`Comando desconhecido: ${args.cmd}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main();
}
