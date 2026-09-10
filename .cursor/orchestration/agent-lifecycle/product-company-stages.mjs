/**
 * Product Company — 12 etapas integradas ao lifecycle P0–P7.
 * ANX-269 — stage tracking por issue ANX-*.
 *
 * @see AI-PRODUCT-COMPANY-ENGINE.md · PRODUCT-COMPANY-MODEL.md
 */

/** @type {Record<string, object>} */
export const PRODUCT_COMPANY_STAGES = {
  PC1: {
    code: "PC1",
    number: 1,
    slug: "strategy",
    name: "Estratégia e visão",
    lifecyclePhases: ["P0"],
    gate: "G-B",
  },
  PC2: {
    code: "PC2",
    number: 2,
    slug: "discovery",
    name: "Discovery",
    lifecyclePhases: ["P0", "P1"],
    gate: "G-D",
  },
  PC3: {
    code: "PC3",
    number: 3,
    slug: "product-definition",
    name: "Product Definition",
    lifecyclePhases: ["P1"],
    gate: "G-D",
  },
  PC4: {
    code: "PC4",
    number: 4,
    slug: "ux-design",
    name: "UX / Design",
    lifecyclePhases: ["P1", "P2"],
    gate: "G-UX",
  },
  PC5: {
    code: "PC5",
    number: 5,
    slug: "technical-architecture",
    name: "Technical Architecture",
    lifecyclePhases: ["P2"],
    gate: "G-A",
  },
  PC6: {
    code: "PC6",
    number: 6,
    slug: "planning",
    name: "Planning / Engineering Breakdown",
    lifecyclePhases: ["P3"],
    gate: "G-P",
  },
  PC7: {
    code: "PC7",
    number: 7,
    slug: "development",
    name: "Development",
    lifecyclePhases: ["P4"],
    gate: "G0-G1",
    pipelineGates: ["G0", "G1"],
  },
  PC8: {
    code: "PC8",
    number: 8,
    slug: "testing",
    name: "Testing / Verification",
    lifecyclePhases: ["P4"],
    gate: "G3",
    pipelineGates: ["G3"],
  },
  PC9: {
    code: "PC9",
    number: 9,
    slug: "code-review",
    name: "Code Review",
    lifecyclePhases: ["P4"],
    gate: "G2-G4-G5",
    pipelineGates: ["G2", "G4", "G5"],
  },
  PC10: {
    code: "PC10",
    number: 10,
    slug: "release",
    name: "Release / Deployment",
    lifecyclePhases: ["P4", "P5", "P6"],
    gate: "G6-G7",
    pipelineGates: ["G6", "G7"],
  },
  PC11: {
    code: "PC11",
    number: 11,
    slug: "operations",
    name: "Production / Operations",
    lifecyclePhases: ["P7"],
    gate: "G-Prod",
  },
  PC12: {
    code: "PC12",
    number: 12,
    slug: "product-intelligence",
    name: "Product Intelligence / Evolution",
    lifecyclePhases: ["P7"],
    gate: "G-Intel",
  },
};

export const STAGE_ORDER = [
  "PC1",
  "PC2",
  "PC3",
  "PC4",
  "PC5",
  "PC6",
  "PC7",
  "PC8",
  "PC9",
  "PC10",
  "PC11",
  "PC12",
];

const SLUG_TO_CODE = Object.fromEntries(
  Object.values(PRODUCT_COMPANY_STAGES).map((s) => [s.slug, s.code]),
);

const NUMBER_TO_CODE = Object.fromEntries(
  Object.values(PRODUCT_COMPANY_STAGES).map((s) => [String(s.number), s.code]),
);

/** Default PC stage when lifecycle phase is set without explicit override. */
export const LIFECYCLE_DEFAULT_STAGE = {
  P0: "PC1",
  P1: "PC2",
  P2: "PC5",
  P3: "PC6",
  P4: "PC7",
  P5: "PC10",
  P6: "PC10",
  P7: "PC11",
};

/**
 * @param {string|number|null|undefined} input
 * @returns {string|null}
 */
export function resolveStageCode(input) {
  if (input == null || input === "") return null;
  const raw = String(input).trim();
  const upper = raw.toUpperCase();
  if (PRODUCT_COMPANY_STAGES[upper]) return upper;
  if (/^PC?\d{1,2}$/i.test(raw)) {
    const num = raw.replace(/^PC/i, "");
    const padded = `PC${Number(num)}`;
    if (PRODUCT_COMPANY_STAGES[padded]) return padded;
  }
  const slug = raw.toLowerCase();
  if (SLUG_TO_CODE[slug]) return SLUG_TO_CODE[slug];
  if (NUMBER_TO_CODE[raw]) return NUMBER_TO_CODE[raw];
  return null;
}

/**
 * Infer PC stage from lifecycle phase + optional gate progress (P4 sub-stages).
 *
 * @param {object} input
 * @param {string} input.lifecyclePhase P0–P7
 * @param {string|null} [input.explicitStage] persisted productCompanyStage
 * @param {Record<string, { status?: string }>|null} [input.gates] G0–G7 statuses
 * @param {string} [input.issueStatus] taskboard status
 * @returns {{ stage: string, stageSlug: string, stageName: string, source: string }}
 */
export function inferProductCompanyStage({
  lifecyclePhase,
  explicitStage = null,
  gates = null,
  issueStatus = "unknown",
}) {
  const explicit = resolveStageCode(explicitStage);
  if (explicit) {
    const meta = PRODUCT_COMPANY_STAGES[explicit];
    return {
      stage: explicit,
      stageSlug: meta.slug,
      stageName: meta.name,
      source: "persisted",
    };
  }

  const phase = lifecyclePhase ?? "P0";

  if (phase === "P4" && gates) {
    const fromGates = inferStageFromGates(gates, issueStatus);
    if (fromGates) {
      const meta = PRODUCT_COMPANY_STAGES[fromGates];
      return {
        stage: fromGates,
        stageSlug: meta.slug,
        stageName: meta.name,
        source: "gates",
      };
    }
  }

  if (phase === "P7" && issueStatus === "done") {
    const meta = PRODUCT_COMPANY_STAGES.PC12;
    return {
      stage: "PC12",
      stageSlug: meta.slug,
      stageName: meta.name,
      source: "lifecycle-done",
    };
  }

  const defaultStage = LIFECYCLE_DEFAULT_STAGE[phase] ?? "PC1";
  const meta = PRODUCT_COMPANY_STAGES[defaultStage];
  return {
    stage: defaultStage,
    stageSlug: meta.slug,
    stageName: meta.name,
    source: "lifecycle",
  };
}

/**
 * @param {Record<string, { status?: string }>} gates
 * @param {string} issueStatus
 * @returns {string|null}
 */
export function inferStageFromGates(gates, issueStatus) {
  const pass = (g) => gates[g]?.status === "pass";

  if (pass("G7") || (pass("G6") && issueStatus === "in_review")) return "PC10";
  if (pass("G5") || pass("G4") || pass("G2")) return "PC9";
  if (pass("G3")) return "PC8";
  if (pass("G1") || pass("G0") || issueStatus === "in_progress") return "PC7";
  return null;
}

/**
 * @param {string} stageCode
 * @returns {{ stage: object, nextStage: object|null }}
 */
export function suggestCompanyStageTransition(stageCode) {
  const code = resolveStageCode(stageCode);
  if (!code) throw new Error(`Etapa Product Company desconhecida: ${stageCode}`);
  const stage = PRODUCT_COMPANY_STAGES[code];
  const idx = STAGE_ORDER.indexOf(code);
  const nextCode = idx >= 0 && idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
  const nextStage = nextCode ? PRODUCT_COMPANY_STAGES[nextCode] : null;
  return { stage, nextStage };
}

/**
 * @param {string} lifecyclePhase
 * @returns {string[]}
 */
export function stagesForLifecyclePhase(lifecyclePhase) {
  return STAGE_ORDER.filter((code) =>
    PRODUCT_COMPANY_STAGES[code].lifecyclePhases.includes(lifecyclePhase),
  );
}
