/**
 * Níveis da hierarquia circular — permanentes (A/B/C) vs on-demand.
 */

/** Núcleo circular — Owner hub (permanente; Owner é humano, não slug) */
export const LEVEL_CENTER = ["orchestrator", "cto-critic"];

/** Level A — liderança estratégica (permanente) */
export const LEVEL_A = ["architect"];

/** Level B — gate leads G2–G5 + GitHub + Docs (permanente) */
export const LEVEL_B = [
  "code-review-lead",
  "qa-lead",
  "security-lead",
  "red-team-lead",
  "github-lead",
  "docs-lead",
];

/** Level C — núcleo de execução + críticos pareados (permanente) */
export const LEVEL_C = [
  "backend-executor",
  "frontend-executor",
  "infra-executor",
  "adapters-executor",
  "backend-critic",
  "frontend-critic",
  "infra-critic",
  "adapters-critic",
];

export const PERMANENT_SLUGS = [...LEVEL_CENTER, ...LEVEL_A, ...LEVEL_B, ...LEVEL_C];

export const ON_DEMAND_PERSONAS = ["researcher"];

export const ON_DEMAND_SPECIALISTS = {
  G2: ["code-reviewer", "typescript-reviewer", "thermo-nuclear-code-quality-review"],
  G3: ["e2e-runner", "validation-review", "pr-test-analyzer"],
  G4: ["security-reviewer", "mantis-threat-model"],
  G5: ["security-reviewer", "silent-failure-hunter"],
};

export const ON_DEMAND_WORKERS = [
  "build-error-resolver",
  "docs-researcher",
  "ci-investigator",
  "database-reviewer",
  "react-build-resolver",
  "explore",
  "generalPurpose",
];

/** Subagent_type Cursor válido para críticos Level C (não existe `critic-reviewer` no Cursor) */
export const CRITIC_CURSOR_SUBAGENT = "code-reviewer";

/** Personas permanentes → subagent_type Cursor (Task tool) */
export const PERSONA_CURSOR_SUBAGENT = {
  orchestrator: null,
  "cto-critic": CRITIC_CURSOR_SUBAGENT,
  architect: "architect",
  researcher: "explore",
  "code-review-lead": "code-reviewer",
  "qa-lead": "e2e-runner",
  "security-lead": "security-review",
  "red-team-lead": "security-review",
  "github-lead": "ci-watcher",
  "docs-lead": "doc-updater",
  "backend-executor": "generalPurpose",
  "frontend-executor": "generalPurpose",
  "infra-executor": "generalPurpose",
  "adapters-executor": "generalPurpose",
  "backend-critic": CRITIC_CURSOR_SUBAGENT,
  "frontend-critic": CRITIC_CURSOR_SUBAGENT,
  "infra-critic": CRITIC_CURSOR_SUBAGENT,
  "adapters-critic": CRITIC_CURSOR_SUBAGENT,
};

/** Workers/specialists on-demand → subagent_type Cursor (1:1 quando possível) */
export const ON_DEMAND_CURSOR_SUBAGENT = {
  "build-error-resolver": "build-error-resolver",
  "docs-researcher": "docs-researcher",
  "ci-investigator": "ci-investigator",
  "database-reviewer": "database-reviewer",
  "react-build-resolver": "react-build-resolver",
  explore: "explore",
  generalPurpose: "generalPurpose",
  "code-reviewer": "code-reviewer",
  "typescript-reviewer": "typescript-reviewer",
  "thermo-nuclear-code-quality-review": "thermo-nuclear-code-quality-review",
  "e2e-runner": "e2e-runner",
  "validation-review": "validation-review",
  "pr-test-analyzer": "pr-test-analyzer",
  "security-reviewer": "security-review",
  "mantis-threat-model": "mantis-threat-model",
  "silent-failure-hunter": "silent-failure-hunter",
  "react-reviewer": "react-reviewer",
  "a11y-architect": "a11y-architect",
  "fix-ci": "fix-ci",
  "ci-watcher": "ci-watcher",
  "compatibility-scan-review": "compatibility-scan-review",
  "code-architect": "code-architect",
  "doc-updater": "doc-updater",
  "open-knowledge": null,
  "make-pr-easy-to-review": "make-pr-easy-to-review",
};

/** @param {string} slug persona ou worker slug */
export function getCursorSubagentType(slug) {
  return PERSONA_CURSOR_SUBAGENT[slug] ?? ON_DEMAND_CURSOR_SUBAGENT[slug] ?? null;
}

/** @param {string} executorSlug */
export function getPairedCriticSubagentType(executorSlug) {
  const criticSlug = EXECUTOR_CRITIC_PAIR[executorSlug];
  return criticSlug ? getCursorSubagentType(criticSlug) : null;
}


export const ON_DEMAND_TYPES = {
  specialist: ON_DEMAND_SPECIALISTS,
  worker: ON_DEMAND_WORKERS,
};

export const GATE_LEAD_MAP = {
  "code-review-lead": "G2",
  "qa-lead": "G3",
  "security-lead": "G4",
  "red-team-lead": "G5",
};

export const ISSUE_SCOPE_MAP = [
  { match: /\bphase-7\b|frontend\//i, personas: ["frontend-executor", "frontend-critic"], workers: ["react-reviewer", "e2e-runner", "a11y-architect"] },
  { match: /\bphase-2\b|backend\/modules/i, personas: ["backend-executor", "backend-critic"], workers: ["typescript-reviewer", "database-reviewer"] },
  { match: /\.github\/|ci\b|boundary/i, personas: ["infra-executor", "infra-critic"], workers: ["ci-investigator", "fix-ci"] },
  { match: /connection|adapter|infer/i, personas: ["adapters-executor", "adapters-critic"], workers: ["security-reviewer"] },
  { match: /security|auth|secret/i, gate: "G4", workers: ["security-reviewer", "mantis-threat-model"] },
  { match: /docs\/|README/i, personas: ["docs-lead"], workers: ["doc-updater"] },
  { match: /spike|research|ADR/i, personas: ["researcher", "architect"], workers: ["docs-researcher"] },
];

export function levelOf(slug) {
  if (LEVEL_CENTER.includes(slug)) return "center";
  if (LEVEL_A.includes(slug)) return "A";
  if (LEVEL_B.includes(slug)) return "B";
  if (LEVEL_C.includes(slug)) return "C";
  if (ON_DEMAND_PERSONAS.includes(slug)) return "on-demand";
  return null;
}

export function isPermanent(slug) {
  return PERMANENT_SLUGS.includes(slug);
}

export const HIRE_AUTHORITY = {
  center: ["specialist", "worker", "critic", "lead", "executor"],
  A: ["specialist", "worker", "critic", "lead", "executor"],
  B: ["specialist", "worker"],
  C: ["worker", "critic-pair"],
};

export const EXECUTOR_CRITIC_PAIR = {
  "backend-executor": "backend-critic",
  "frontend-executor": "frontend-critic",
  "infra-executor": "infra-critic",
  "adapters-executor": "adapters-critic",
};

/** Par crítico do núcleo — governança (não confundir com críticos de domínio Level C) */
export const ORCHESTRATOR_CRITIC_PAIR = {
  orchestrator: "cto-critic",
};

export const EXECUTOR_WORKERS = {
  "backend-executor": ["build-error-resolver", "typescript-reviewer", "database-reviewer", "code-architect"],
  "frontend-executor": ["react-reviewer", "a11y-architect", "e2e-runner", "build-error-resolver"],
  "infra-executor": ["fix-ci", "ci-watcher", "ci-investigator", "compatibility-scan-review"],
  "adapters-executor": ["security-reviewer", "code-architect", "build-error-resolver"],
};

export const GATE_DOMAIN = {
  "code-review-lead": ON_DEMAND_SPECIALISTS.G2,
  "qa-lead": ON_DEMAND_SPECIALISTS.G3,
  "security-lead": ON_DEMAND_SPECIALISTS.G4,
  "red-team-lead": ON_DEMAND_SPECIALISTS.G5,
  "github-lead": ["ci-watcher", "fix-ci", "ci-investigator", "make-pr-easy-to-review"],
  "docs-lead": ["doc-updater", "open-knowledge"],
};

const LEAD_SLUGS = new Set([...LEVEL_B, ...LEVEL_CENTER]);
const EXECUTOR_SLUGS = new Set(LEVEL_C.filter((s) => s.endsWith("-executor")));
const CRITIC_SLUGS = new Set(Object.values(EXECUTOR_CRITIC_PAIR));
const ALL_HIREABLE = new Set([
  ...ON_DEMAND_WORKERS,
  ...Object.values(ON_DEMAND_SPECIALISTS).flat(),
  ...Object.values(GATE_DOMAIN).flat(),
]);

export function getPersonaLevel(slug) {
  return levelOf(slug);
}

export function getTargetType(target) {
  if (LEAD_SLUGS.has(target)) return "lead";
  if (EXECUTOR_SLUGS.has(target)) return "executor";
  if (CRITIC_SLUGS.has(target) || LEVEL_C.includes(target)) return "critic";
  if (ALL_HIREABLE.has(target)) {
    const specialists = Object.values(ON_DEMAND_SPECIALISTS).flat();
    return specialists.includes(target) ? "specialist" : "worker";
  }
  return "unknown";
}

export function canHire(hirer, target, issueId) {
  void issueId;
  const level = getPersonaLevel(hirer);
  if (!level || level === "on-demand") {
    return { allowed: false, level, targetType: getTargetType(target), error: `Persona sem autoridade de hire: ${hirer}` };
  }
  const targetType = getTargetType(target);
  if (level === "center" || level === "A") return { allowed: true, level, targetType };

  const allowedTypes = HIRE_AUTHORITY[level] ?? [];
  const persona = hirer;

  if (level === "B") {
    if (!allowedTypes.includes(targetType)) {
      return { allowed: false, level, targetType, error: `Level B não pode contratar tipo ${targetType}` };
    }
    const domain = GATE_DOMAIN[hirer] ?? [];
    if (!domain.includes(target)) {
      return { allowed: false, level, targetType, error: `Level B ${hirer} só contrata no domínio do gate: ${domain.join(", ")}` };
    }
    return { allowed: true, level, targetType };
  }

  if (level === "C") {
    if (hirer.endsWith("-critic")) {
      return { allowed: false, level, targetType, error: "Crítico Level C não contrata diretamente; use consult→B specialist" };
    }
    if (targetType === "critic" || CRITIC_SLUGS.has(target)) {
      const paired = EXECUTOR_CRITIC_PAIR[hirer];
      if (target !== paired) {
        return { allowed: false, level, targetType: "critic-pair", error: "Level C executor só pode contratar workers e seu crítico pareado" };
      }
      return { allowed: true, level, targetType: "critic-pair" };
    }
    if (EXECUTOR_SLUGS.has(target) || (CRITIC_SLUGS.has(target) && target !== EXECUTOR_CRITIC_PAIR[hirer])) {
      return { allowed: false, level, targetType, error: "Level C não pode contratar executor/crítico de outro domínio sem aprovação B ou A" };
    }
    if (LEAD_SLUGS.has(target)) {
      return { allowed: false, level, targetType, error: "Level C executor só pode contratar workers e seu crítico pareado" };
    }
    const workers = EXECUTOR_WORKERS[hirer] ?? [];
    if (!workers.includes(target)) {
      return { allowed: false, level, targetType, error: "Level C executor só pode contratar workers e seu crítico pareado" };
    }
    return { allowed: true, level, targetType: "worker" };
  }

  return { allowed: false, level, targetType, error: `Level ${level} não autorizado` };
}

export function canDismiss(dismisser, hire) {
  if (dismisser === "orchestrator") return { allowed: true, reason: "CTO override" };
  if (dismisser === hire.hiredBy) return { allowed: true, reason: "contratante original" };
  const dismisserLevel = getPersonaLevel(dismisser);
  const hirerLevel = getPersonaLevel(hire.hiredBy);
  if (dismisserLevel === "center" || dismisserLevel === "A") return { allowed: true, reason: "Level center/A" };
  if (dismisserLevel === "B" && hirerLevel === "C") return { allowed: true, reason: "gate lead sobre worker C" };
  return { allowed: false, reason: `Sem autoridade para dismiss: ${dismisser}` };
}
