/**
 * ANX-279 — registry P1 self-healing runbooks (sandbox/staging).
 *
 * User instruction (goal): "Self-healing runbook executor staging" — execute P1 runbooks
 * from notes/anxionos-self-healing-runbooks.md with structured logs + rollback (ANX-279).
 *
 * Importers/callers: self-healing-executor.mjs, self-healing-cli.mjs, self-healing-executor.test.mjs
 * API: SELF_HEALING_RUNBOOKS, listRunbookIds(), getRunbook(id)
 * Schema: SelfHealingRunbook { id, name, component, requiresDecisionRecord, requiresG4, allowedEnvironments[] }
 */
/** @typedef {'staging' | 'dev' | 'test'} SelfHealingEnvironment */

/**
 * @typedef {object} SelfHealingRunbook
 * @property {string} id
 * @property {string} name
 * @property {string} component
 * @property {boolean} requiresDecisionRecord
 * @property {boolean} requiresG4
 * @property {string[]} allowedEnvironments
 */

/** @type {Record<string, SelfHealingRunbook>} */
export const SELF_HEALING_RUNBOOKS = {
  "sh-rb-001-redis-pool": {
    id: "sh-rb-001-redis-pool",
    name: "Redis connection pool exhaustion",
    component: "cache Redis",
    requiresDecisionRecord: true,
    requiresG4: true,
    allowedEnvironments: ["staging", "dev", "test"],
  },
  "sh-rb-002-http-5xx": {
    id: "sh-rb-002-http-5xx",
    name: "HTTP 5xx rate spike — canary restart",
    component: "backend/apps/api",
    requiresDecisionRecord: false,
    requiresG4: true,
    allowedEnvironments: ["staging", "dev", "test"],
  },
  "sh-rb-003-pg-pool": {
    id: "sh-rb-003-pg-pool",
    name: "PostgreSQL connection saturation",
    component: "PostgreSQL pool (app)",
    requiresDecisionRecord: true,
    requiresG4: true,
    allowedEnvironments: ["staging", "dev", "test"],
  },
};

export function listRunbookIds() {
  return Object.keys(SELF_HEALING_RUNBOOKS);
}

export function getRunbook(runbookId) {
  const runbook = SELF_HEALING_RUNBOOKS[runbookId];
  if (!runbook) {
    throw new Error(`Unknown runbook: ${runbookId}`);
  }
  return runbook;
}
