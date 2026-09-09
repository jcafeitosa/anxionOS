#!/usr/bin/env node
/**
 * Roster lookup — mutual awareness CLI.
 *
 * Usage:
 *   npm run orchestration:who -- --list
 *   npm run orchestration:who -- --persona <slug>
 *   npm run orchestration:who -- --persona <slug> --can-i "<ação>"
 */

import { fileURLToPath } from "node:url";
import { PERSONAS, PERSONA_SLUGS, getPersona, resolvePersonaSlug } from "./personas.mjs";
import {
  levelOf,
  GATE_LEAD_MAP,
  EXECUTOR_CRITIC_PAIR,
  canHire,
} from "../agent-hire/levels.mjs";

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

/** @type {Array<{ pattern: RegExp, owner: string, reason: string }>} */
const EXCLUSIVE_ACTIONS = [
  {
    pattern: /code[- ]?review|revisar diff|\bg2\b|verdict g2/i,
    owner: "code-review-lead",
    reason: "Code review formal G2 é exclusivo de code-review-lead",
  },
  {
    pattern: /\bqa\b|\bg3\b|teste e2e formal|validar produto/i,
    owner: "qa-lead",
    reason: "QA formal G3 é exclusivo de qa-lead",
  },
  {
    pattern: /security review|\bg4\b|threat model|tenancy/i,
    owner: "security-lead",
    reason: "Security G4 é exclusivo de security-lead",
  },
  {
    pattern: /red[- ]?team|\bg5\b|adversarial/i,
    owner: "red-team-lead",
    reason: "Red Team G5 é exclusivo de red-team-lead",
  },
  {
    pattern: /verdict g1|emitir g1|pass g1/i,
    owner: "__critic__",
    reason: "Verdict G1 é exclusivo do crítico pareado",
  },
  {
    pattern: /\bg7\b|aceite final|cto-accept|decision/i,
    owner: "orchestrator",
    reason: "G7/decision é exclusivo da CTO",
  },
  {
    pattern: /implement.*frontend|frontend component|componente ui|frontend\//i,
    owner: "frontend-executor",
    reason: "Implementação frontend é exclusiva de frontend-executor",
  },
  {
    pattern: /implement.*backend|backend\/modules|módulo backend/i,
    owner: "backend-executor",
    reason: "Implementação backend é exclusiva de backend-executor",
  },
  {
    pattern: /\.github|\b(ci|pipeline)\b|boundary|deploy script/i,
    owner: "infra-executor",
    reason: "Infra/CI é exclusivo de infra-executor",
  },
  {
    pattern: /adapter|connections|gateway|simulated/i,
    owner: "adapters-executor",
    reason: "Adapters/connections é exclusivo de adapters-executor",
  },
  {
    pattern: /docs? públic|editar docs\/|readme público/i,
    owner: "docs-lead",
    reason: "Docs públicas são exclusivas de docs-lead",
  },
  {
    pattern: /pr policy|merge readiness|rejeitar pr/i,
    owner: "github-lead",
    reason: "Política PR/CI é exclusiva de github-lead",
  },
  {
    pattern: /spike|pesquisa formal|research spike/i,
    owner: "researcher",
    reason: "Pesquisa formal é exclusiva de researcher",
  },
];


/** Domínios Level C → slugs do par */
const LEVEL_C_DOMAIN_SLUGS = {
  backend: ["backend-executor", "backend-critic"],
  frontend: ["frontend-executor", "frontend-critic"],
  infra: ["infra-executor", "infra-critic"],
  adapters: ["adapters-executor", "adapters-critic"],
};

const FRAMEWORK_ACTION_PATTERNS = [
  /framework/i,
  /workflow-[\w-]+\.md/i,
  /orchestration\/workflows/i,
  /melhorar.*orquestra/i,
  /editar.*workflow/i,
  /edit.*workflow/i,
  /PERSONAS\.md/i,
  /delegation-queue/i,
];

const GLOBAL_POLICY_DENY_PATTERNS = [
  /HIERARCHY\.md/i,
  /MANDATORY-COMPLIANCE/i,
  /CTO-AUTHORITY/i,
  /hire level/i,
  /roster\.anxionos/i,
  /agent-hire\/levels/i,
  /AGENT-ROSTER\.md/i,
];

function domainOfLevelC(slug) {
  for (const [domain, slugs] of Object.entries(LEVEL_C_DOMAIN_SLUGS)) {
    if (slugs.includes(slug)) return domain;
  }
  return null;
}

function isFrameworkAction(action) {
  return FRAMEWORK_ACTION_PATTERNS.some((p) => p.test(action));
}

function targetDomainFromAction(action) {
  if (/backend/i.test(action)) return "backend";
  if (/frontend/i.test(action)) return "frontend";
  if (/infra|\.github|\bci\b|pipeline/i.test(action)) return "infra";
  if (/adapter|connections/i.test(action)) return "adapters";
  return null;
}

export function canImproveFramework(slug, action) {
  const domain = domainOfLevelC(slug);
  if (!domain) {
    return {
      allowed: false,
      reason: "Melhoria de framework Level C é exclusiva de executores e críticos pareados",
      owner: "orchestrator",
      suggestion: "escalate @renata ou consult par Level C do domínio",
      scope: null,
    };
  }

  if (GLOBAL_POLICY_DENY_PATTERNS.some((p) => p.test(action))) {
    return {
      allowed: false,
      reason: "Política global do framework — exclusiva do núcleo (Renata/Cláudia)",
      owner: "orchestrator",
      suggestion: "consult/escalate @renata — não editar sem aprovação",
      scope: "global-policy",
    };
  }

  const target = targetDomainFromAction(action);
  const ownSlugs = LEVEL_C_DOMAIN_SLUGS[domain];
  const allowedArtifacts = ownSlugs.map((s) => `workflow-${s}.md`).join(", ");

  if (target && target !== domain) {
    const ownerSlug = LEVEL_C_DOMAIN_SLUGS[target][0];
    return {
      allowed: false,
      reason: `Workflow/framework de outro domínio (${target}) — requer consult ao par alvo`,
      owner: ownerSlug,
      suggestion: `consult @${ownerSlug.replace(/-executor$/, "")} — handoff com --issue ANX-N`,
      scope: `cross-team:${target}`,
    };
  }

  return {
    allowed: true,
    reason: `Autonomia Level C — melhorar framework do domínio ${domain} (par colaborando, issue claimada)`,
    owner: slug,
    suggestion: "broadcast status/share/collab + npm run orchestration:verify após diff material",
    scope: `domain:${domain}`,
    artifacts: allowedArtifacts,
  };
}

const SHARED_PATTERNS = [/\bconsult\b|\bdebate\b|\bshare\b|\bescalate\b|@mention/i];
const HIRE_PATTERNS = [/\bcontrat|\bhire\b/i];

function gateOf(slug, persona) {
  if (slug === "orchestrator") return "G7";
  if (persona.role === "critic") return "G1";
  if (persona.criticSlug) return `G1 (via ${persona.criticSlug})`;
  return GATE_LEAD_MAP[slug] ?? "—";
}

function ownerMention(ownerSlug) {
  const p = PERSONAS[ownerSlug];
  return p ? `@${p.shortName.toLowerCase()}` : ownerSlug;
}

function findExclusiveOwner(action) {
  for (const rule of EXCLUSIVE_ACTIONS) {
    if (rule.pattern.test(action)) return rule;
  }
  return null;
}

export function canDoAction(slug, action) {
  const persona = getPersona(slug);
  const normalized = action.trim();

  if (SHARED_PATTERNS.some((p) => p.test(normalized))) {
    return {
      allowed: true,
      reason: "Competência compartilhada — consult/debate/share sem editar artefato alheio",
      owner: null,
      suggestion: "npm run orchestration:speak -- --type consult --issue ANX-N",
    };
  }

  if (HIRE_PATTERNS.some((p) => p.test(normalized))) {
    const targetMatch =
      normalized.match(/(?:contrat(?:ar)?|hire)\s+([\w-]+)/i) ??
      normalized.match(/([\w-]+)$/);
    const target = targetMatch?.[1];
    if (!target) {
      return {
        allowed: false,
        reason: "Especifique alvo: --can-i 'contratar build-error-resolver'",
        owner: null,
        suggestion: "ver HIRE-DELEGATION.md",
      };
    }
    const result = canHire(slug, target, "ANX-0");
    return {
      allowed: result.allowed,
      reason: result.allowed ? "Hire autorizado para este nível" : result.error ?? "Hire negado",
      owner: result.allowed ? slug : "orchestrator",
      suggestion: result.allowed ? "npm run orchestration:hire" : "consult lead B ou escalate @renata",
      target,
    };
  }

  if (isFrameworkAction(normalized)) {
    const fw = canImproveFramework(slug, normalized);
    return {
      allowed: fw.allowed,
      reason: fw.reason,
      owner: fw.owner,
      suggestion: fw.suggestion,
      scope: fw.scope,
      artifacts: fw.artifacts,
    };
  }

  const rule = findExclusiveOwner(normalized);
  if (!rule) {
    return {
      allowed: true,
      reason: "Ação não mapeada — verifique AGENT-ROSTER antes de editar domínio alheio",
      owner: null,
      suggestion: "consult ao owner do domínio",
    };
  }

  let owner = rule.owner;
  if (owner === "__critic__") {
    if (persona.role === "critic") {
      return {
        allowed: true,
        reason: "Crítico emite verdict G1 do executor pareado",
        owner: slug,
        suggestion: "verdict com --evidence",
      };
    }
    owner = persona.criticSlug ?? EXECUTOR_CRITIC_PAIR[slug] ?? "backend-critic";
    return {
      allowed: false,
      reason: rule.reason,
      owner,
      suggestion: `consult ${ownerMention(owner)} ou aguardar handoff G1`,
    };
  }

  if (/adr|arquitetura/i.test(normalized)) {
    if (slug === "architect" && !/implement|codar|editar/i.test(normalized)) {
      return {
        allowed: true,
        reason: "Architect: parecer ADR/consult (não implementa produção)",
        owner: slug,
        suggestion: "debate ou share com paths brain/",
      };
    }
    if (slug !== "architect") {
      return {
        allowed: false,
        reason: "Parecer arquitetural é consult de architect",
        owner: "architect",
        suggestion: `consult ${ownerMention("architect")}`,
      };
    }
  }

  if (persona.role === "critic" && /implement|codar|fix|corrigir/i.test(normalized)) {
    const exec = persona.criticOf ?? "executor pareado";
    return {
      allowed: false,
      reason: "Crítico não implementa sem handoff",
      owner: exec,
      suggestion: `handoff a ${ownerMention(exec)}`,
    };
  }

  const allowed = slug === owner;
  return {
    allowed,
    reason: allowed ? "Competência exclusiva sua" : rule.reason,
    owner: allowed ? slug : owner,
    suggestion: allowed
      ? "Prosseguir com issue claimada e broadcast"
      : `consult ${ownerMention(owner)} — handoff/escalate com --issue ANX-N`,
  };
}

function cmdList() {
  console.log("slug\tnome\tlevel\tgate\tpar");
  for (const slug of PERSONA_SLUGS) {
    const p = PERSONAS[slug];
    const level = levelOf(slug) ?? p.hierarchyLevel ?? "on-demand";
    const gate = gateOf(slug, p);
    const pair = p.criticSlug ?? (p.criticOf ? `of:${p.criticOf}` : "—");
    console.log(`${slug}\t${p.fullName}\t${level}\t${gate}\t${pair}`);
  }
  console.log("\nDocs: .cursor/orchestration/AGENT-ROSTER.md");
}

function cmdPersona(slug) {
  const p = getPersona(slug);
  const level = levelOf(slug) ?? p.hierarchyLevel ?? "on-demand";
  const lines = [
    `Persona: ${p.fullName} (@${p.shortName.toLowerCase()})`,
    `Slug: ${p.slug}`,
    `Level: ${level}`,
    `Time: ${p.team}`,
    `Papel: ${p.role}`,
    `Gate: ${gateOf(slug, p)}`,
  ];
  if (p.criticSlug) lines.push(`Crítico: ${p.criticSlug} (${PERSONAS[p.criticSlug]?.fullName})`);
  if (p.criticOf) lines.push(`Critica: ${p.criticOf} (${PERSONAS[p.criticOf]?.fullName})`);
  if (p.reportsTo) lines.push(`Reporta a: ${p.reportsTo}`);
  console.log(lines.join("\n"));
  console.log("\nRoster: AGENT-ROSTER.md · Limites: COMPETENCE-BOUNDARIES.md");
}

function cmdCanI(slug, action) {
  const result = canDoAction(slug, action);
  console.log(result.allowed ? "ALLOW: SIM" : "ALLOW: NÃO");
  if (result.owner) {
    const name = PERSONAS[result.owner]?.fullName ?? result.owner;
    console.log(`Owner: ${result.owner} (${name})`);
  }
  console.log(`Motivo: ${result.reason}`);
  console.log(`Sugestão: ${result.suggestion}`);
  process.exit(result.allowed ? 0 : 2);
}

function parseArgs(argv) {
  const opts = { list: false, persona: null, canI: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--list") opts.list = true;
    else if (a === "--persona") opts.persona = argv[++i];
    else if (a === "--can-i") opts.canI = argv[++i];
    else if (a === "--help" || a === "-h") opts.help = true;
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  return opts;
}

function usage() {
  console.log(`Usage:
  npm run orchestration:who -- --list
  npm run orchestration:who -- --persona <slug>
  npm run orchestration:who -- --persona <slug> --can-i "<ação>"`);
}

if (isMain) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help || (!opts.list && !opts.persona)) {
      usage();
      process.exit(opts.help ? 0 : 1);
    }
    if (opts.list) {
      cmdList();
    } else {
      const resolved = resolvePersonaSlug(opts.persona);
      const slug = resolved?.slug ?? opts.persona;
      getPersona(slug);
      if (opts.canI) cmdCanI(slug, opts.canI);
      else cmdPersona(slug);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
