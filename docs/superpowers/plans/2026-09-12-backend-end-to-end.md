---
type: plan
---

# Backend End-to-End dos 23 Módulos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Complete the anxionOS backend end to end across the accepted 23 domain modules, from shared contracts and persistence through institutional graph, agent operations, connections, investment execution, commercial operations, evolution, recovery, and launch verification.

**Architecture:** Preserve the accepted modular layout: each domain owns its state and use cases under \`backend/modules/<module>/{domain,application,infrastructure,api,graph,workers}\`; shared mechanisms remain in \`backend/packages\`; composition roots remain in \`backend/apps\`; specialized protocols remain in \`backend/services\`. Modules communicate through public contracts, SDKs, and versioned events. \`adapter-gateway\` remains a composition/adapter surface, not a 24th owner module.

**Tech Stack:** Bun, TypeScript, Elysia, Astro/React consumers, Zod, Drizzle over pg, PostgreSQL, Neo4j, TimescaleDB, pgvector, structured observability, versioned journal/outbox/inbox, and sandboxed SIMULATED engines. Exact versions and peer compatibility must be verified from the lockfile and official package metadata before dependency changes.

**Spec:** [docs/superpowers/specs/2026-09-12-backend-end-to-end-design.md](../specs/2026-09-12-backend-end-to-end-design.md)

## Verified Progress (2026-09-13)

- [x] `ANX-468`: generated OpenAPI preserves declared path, tenancy, request-id, and idempotency parameters across the module catalog; request bodies and response schemas remain present.
- [x] `ANX-503`: the partners migration upgrades pre-P07 databases, backfills `organization_id` into canonical partner ownership, creates the payout ledger, and lets the API boot without PostgreSQL `42703`; onboarding and organization-selection routes now have real heading assertions and scoped axe coverage.
- [x] `ANX-508`: CI workflows pin all `actions/checkout` and `actions/setup-node` references to immutable official v4.4.0 SHAs; orchestration verification remains green.
- [x] `ANX-511`: eventing now persists and reconstructs tenant `agencyId` across journal/outbox/DLQ, backfills valid legacy payloads, and atomically fences poison events into terminal `dead_letter` status; targeted PostgreSQL relay/fencing tests pass.
- [x] `ANX-512`: orchestration S5 now reserves wakeup budget through a transaction-bound PostgreSQL adapter backed by `orchestration_operational_budgets`, with atomic cap enforcement, configurable per-organization limits, migration coverage, and concurrent reservation tests; regular suite passes 1845/1845 and fresh PostgreSQL oracle passes 1883/1883.
- [x] `ANX-500`: authorized Partner/Platform console journeys, auth-page smoke coverage, and axe checks are covered by reusable E2E fixtures; the full local E2E suite passes 43/43.
- [x] `ANX-502`: dead frontend shell paths and the unreachable `RoleArchifyDashboard` branch were removed; frontend unit, typecheck, and build verification remain green.
- [x] Backend baseline: 23 owner modules plus `adapter-gateway` match the accepted layout; lint, typecheck, full unit suite, and fresh-database oracle are green for the recorded runs.
- [ ] Program acceptance remains open while the board-owned identity, governance, OpenAPI response, idempotency, tenancy, error-boundary, and platform-security slices are still in progress or in review. REAL capital and L3/L4 autonomy remain non-authorized.

## Global Constraints

- Read \`AGENTS.md\`, load the orchestration framework, ensure the Dashi board, claim one \`ANX-*\` issue, and pass orchestration pre-work before every implementation slice.
- Use the canonical module ownership and phase sequence in \`brain/notes/anxionos-backend-structure.md\`; do not create a new owner module for a capability line.
- Route Markdown reads and writes through OpenKnowledge MCP. Do not commit \`brain/\`.
- Keep domain code framework-free; application code depends on ports; infrastructure implements ports; composition roots inject adapters.
- Every state mutation must define authorization, tenant/agency scope, expected version, idempotency, lease/fencing where relevant, journal, outbox, replay/rebuild behavior, and structured error mapping.
- Validate schemas at every external boundary. Test positive and negative paths, conflicting idempotency payloads, concurrency/fencing, tenancy isolation, journal/outbox atomicity, projection rebuild, timeout/UNKNOWN, checkpoint/replay, redacted observability, and rollback.
- REAL capital, live venue execution, and L3/L4 autonomy remain out of scope. SIMULATED behavior must be explicit and must never be represented as production evidence.
- Do not mark a phase complete from route counts or \`index.ts\` presence. Completion requires executable acceptance evidence and a traceable requirement-to-test matrix.
- Do not introduce stubs, fake production data, silent catches, untracked TODOs, hardcoded secrets/tenant IDs/hosts, or duplicate business rules.

## Dependency Graph and Execution Policy

The critical path is:

\`P01 → P02 → P03 → P04 → P05 → P06 → P07 → P08 → P09\`.

Within a phase, work may be parallelized only after the shared contract and ownership gate passes. The first execution slice is the existing migration/tenancy/idempotency cluster: ANX-470, ANX-474, ANX-460, ANX-481, and ANX-496. Do not take an issue already bound to another conversation; create or select a distinct child issue when the existing issue is unavailable.

The master issue ANX-509 coordinates this program. Each implementation task below requires a child issue, a context package, a claimed owner, a handoff comment, and its own verification evidence.

## Task 1: Establish the program baseline and phase gates

**Files:**

- \`AGENTS.md\`
- \`.cursor/orchestration/\`
- \`backend/modules/*/index.ts\`
- \`backend/packages/\`
- \`docs/orchestration/module-contract-matrix-23.md\`
- \`docs/superpowers/specs/2026-09-12-backend-end-to-end-design.md\`
- \`docs/superpowers/plans/2026-09-12-backend-end-to-end.md\`
- New phase-specific acceptance matrices under \`docs/orchestration/\`, only when a child issue authorizes them.

- [ ] Create a child issue for the baseline slice and record the canonical source section, capability, owner, layer, storage, events, tests, and current evidence.
- [ ] Capture the current branch, dirty files, resolved imports, module index exports, available migrations, test commands, and environment prerequisites.
- [ ] Generate or refresh the Graphify index before bulk exploration, then use code-review graph tooling when available for ownership and impact.
- [ ] Define the phase exit record: requirements, implementation symbols, acceptance tests, commands, results, residual risks, and rollback.
- [ ] Run the non-mutating baseline checks: \`npm run taskboard:ensure\`, \`npm run graphify:check\`, \`bun run lint\`, and \`tsc --build\`; record failures without masking unrelated baseline defects.
- [ ] Exit criterion: a versioned baseline and child issue exist, with no implementation started outside the claimed slice.

## Task 2: P01 — Tooling, boundaries, and deterministic test harness

**Files:**

- \`backend/packages/contracts/**\`
- \`backend/packages/eventing/**\`
- \`backend/packages/database/**\`
- \`backend/packages/observability/**\`
- \`backend/apps/**\`
- \`backend/tests/**\`
- \`package.json\`, lockfile, and relevant configuration files.

- [ ] Verify the current Bun/TypeScript/build/test topology and document runtime compatibility for PostgreSQL, Neo4j, TimescaleDB, and pgvector.
- [ ] Enforce boundary rules and import direction with automated checks covering domain/application/infrastructure/apps.
- [ ] Provide deterministic fixtures and harnesses for schema validation, event envelopes, clock control, idempotency, expected versions, leases, checkpoints, UNKNOWN outcomes, and tenant context.
- [ ] Add contract tests for shared envelopes, error mapping, pagination, correlation, redaction, and serialization compatibility.
- [ ] Make every external dependency configurable through typed environment configuration; update \`backend/.env.example\` for dev-only flags without exposing secrets.
- [ ] Exit criterion: boundaries and shared test primitives pass independently and are reusable by all later phases.

## Task 3: P02 — Contracts, eventing, persistence, identity, organizations, and governance

**Files:**

- \`backend/modules/identity/**\`
- \`backend/modules/organizations/**\`
- \`backend/modules/governance/**\`
- \`backend/packages/contracts/**\`
- \`backend/packages/eventing/**\`
- \`backend/packages/database/**\`
- Database migration roots and fresh-bootstrap tests.
- Existing child issues ANX-470, ANX-474, ANX-460, and ANX-481, when claimable under board rules.

- [ ] Complete and verify authoritative PostgreSQL migrations for every P02-owned table, including audit, billing, connections, knowledge, orchestration, and tenant-related dependencies identified by ANX-470.
- [ ] Implement atomic state + journal + outbox transactions, inbox/replay handling, event versioning, checkpointing, and projection rebuild contracts.
- [ ] Fix idempotency semantics so the same key with a divergent payload returns a typed conflict and cannot be treated as a successful replay; cover the systemic helper and module-specific wrappers from ANX-474.
- [ ] Complete tenant, agency, organization, membership, invite, role, grant, epoch, session, and capability checks; resolve PrincipalLookup scope and opaque-result behavior from ANX-481/ANX-460 without leaking cross-tenant existence.
- [ ] Complete the organizations collection/API behavior needed by downstream owner/operator flows.
- [ ] Add fresh-database, migration replay, transaction rollback, RLS/ambient-scope, authorization-negative, and conflicting-payload tests.
- [ ] Exit criterion: a fresh PostgreSQL environment can bootstrap, mutate, replay, and rebuild P02 state with isolated tenants and auditable results.

## Task 4: P03 — Graph kernel and institutional projections

**Files:**

- \`backend/modules/graph/**\`
- \`backend/modules/identity/**\` and \`backend/modules/governance/**\` projector contracts only.
- \`backend/packages/contracts/**\`
- Neo4j adapter/configuration and graph integration tests.
- Graph acceptance fixtures T01–T20.

- [ ] Define graph node/edge schemas, ownerDomain, eventId, checkpoint, provenance, authority, risk, and lifecycle fields.
- [ ] Implement governed projection consumers from journal/outbox events with replay, checkpoint, dead-letter/error handling, and rebuild from authoritative PostgreSQL state.
- [ ] Enforce agency/platform separation, tenant isolation, ownership boundaries, and safe projection of grants/capabilities.
- [ ] Add T01–T20 fixture coverage for creation, mutation, revocation, supersession, conflict, replay, rebuild, stale checkpoints, and unauthorized graph queries.
- [ ] Verify that Graph Kernel reads are projections and never become an alternate source of transactional authority.
- [ ] Exit criterion: graph projections are reproducible from events/state and pass the kernel acceptance suite.

## Task 5: P04 — Agents, orchestration, and knowledge

**Files:**

- \`backend/modules/agents/**\`
- \`backend/modules/orchestration/**\`
- \`backend/modules/knowledge/**\`
- \`backend/packages/sdk/**\`
- \`backend/services/research-python/**\` where the protocol is owned by the module.
- RAG/agent fixtures AG01–AG08.

- [ ] Complete agent lifecycle, capability manifests, heartbeat, assignment, delegation, budget/lease checks, and auditable run state.
- [ ] Complete orchestration scheduling, queue ownership, retries, timeouts, UNKNOWN mapping, cancellation, checkpoint/recovery, and worker shutdown semantics.
- [ ] Complete knowledge ingestion, provenance, chunking/indexing, pgvector retrieval, scope filtering, freshness, and redaction behavior.
- [ ] Ensure inference belongs to connections where specified; orchestration consumes the public connection contract rather than implementing provider policy.
- [ ] Add AG01–AG08 tests for onboarding, authorization, delegation, failed provider, timeout, retry, stale lease, knowledge scope, and redacted traces.
- [ ] Exit criterion: a governed agent run can be created, scheduled, supplied with scoped knowledge, observed, recovered, and audited end to end.

## Task 6: P05 — Connections and provider binding

**Files:**

- \`backend/modules/connections/**\`
- \`backend/packages/secrets/**\`
- \`backend/packages/sdk/**\`
- Provider adapters and connection workers owned by the connections module.
- CX01–CX10 fixtures.

- [ ] Implement binding lifecycle, provider catalog, capability negotiation, credential references, health/cooldown, rate limits, and tenant/agency scope.
- [ ] Keep secrets in the authorized secret store path; never place tokens in DTOs, events, prompts, graph properties, or logs.
- [ ] Implement inference/provider calls with explicit timeout, retry policy, UNKNOWN outcome, idempotency, redacted observability, and provider correlation.
- [ ] Add CX01–CX10 contract and integration tests using isolated provider fixtures, including malformed response and partial failure behavior.
- [ ] Verify orchestration and research consumers use public SDK/ports and cannot bypass connection policy.
- [ ] Exit criterion: provider binding and inference calls are governed, replay-safe, scoped, observable, and failure-explicit.

## Task 7: P06 — Investment chain and financial reconciliation

**Files:**

- \`backend/modules/market-data/**\`
- \`backend/modules/strategies/**\`
- \`backend/modules/capital/**\`
- \`backend/modules/portfolios/**\`
- \`backend/modules/decisions/**\`
- \`backend/modules/risk/**\`
- \`backend/modules/execution/**\`
- \`backend/modules/accounting/**\`
- \`backend/modules/performance/**\`
- \`backend/modules/audit/**\`
- \`backend/services/execution-go/**\`
- \`backend/modules/adapter-gateway/**\` only for composition/adapter integration.
- FI01–FI12 fixtures and reconciliation test roots.

- [ ] Complete market-data ingestion, normalization, freshness, provenance, TimescaleDB retention, and stale-data rejection.
- [ ] Complete strategy evaluation and decision creation with deterministic inputs, versioned artifacts, authority checks, and traceability to data.
- [ ] Complete risk checks, limits, approvals, capital reservation, quota/epoch fencing, and explicit rejection reasons.
- [ ] Complete execution intent, venue adapter protocol, idempotent submission, timeout/UNKNOWN, reconciliation, cancel/replace policy, and simulated-engine boundaries.
- [ ] Complete accounting journal, financial reconciliation, portfolio projection, performance series, and audit trail from authoritative events.
- [ ] Verify the chain: market-data → strategies → decisions → risk → capital → execution → accounting → portfolios → performance, with simulation isolated.
- [ ] Add FI01–FI12 tests covering stale data, duplicate command, conflicting command, concurrent reservation, risk rejection, partial venue response, unknown order, reconciliation drift, accounting mismatch, projection rebuild, and tenant isolation.
- [ ] Exit criterion: a SIMULATED investment lifecycle is reproducible, risk-governed, reconciled, and fully auditable without implying real-capital readiness.

## Task 8: P07 — Billing, partners, operations, and human-facing contracts

**Files:**

- \`backend/modules/billing/**\`
- \`backend/modules/partners/**\`
- \`backend/modules/operations/**\`
- \`backend/apps/**\`
- \`frontend/**\` only under a separately claimed frontend issue and the Astro/React contract.
- \`backend/tests/**\` for UI01–UI06 API and authorization evidence.

- [ ] Complete billing plans, entitlements, usage metering, invoice/export boundaries, and immutable financial/audit records.
- [ ] Complete partner onboarding, referral/attribution boundaries, permissions, settlement inputs, and tenant isolation.
- [ ] Complete operations health, capability registry, worker/runtime status, incident-safe controls, and SLO/auth evidence.
- [ ] Complete missing public collection contracts such as the agency agents catalog identified by ANX-496.
- [ ] Add UI01–UI06 API contract and parity tests; implement frontend consumers only after explicit frontend child issues and approved route contracts exist.
- [ ] Exit criterion: owner, operator, platform, and partner workflows can consume consistent authorized contracts with no hidden administrative bypass.

## Task 9: P08 — Evaluation, simulation, evolution, and promotion safety

**Files:**

- \`backend/modules/evaluation/**\`
- \`backend/modules/simulation/**\`
- \`backend/modules/agents/**\` and \`backend/modules/strategies/**\` only through public evolution contracts.
- EV01–EV08 fixtures and simulation benchmark roots.

- [ ] Complete evaluation datasets, metric definitions, reproducibility, provenance, model/strategy versioning, and result persistence.
- [ ] Complete isolated simulation lifecycle, deterministic seed/configuration, resource budgets, checkpoints, replay, and no-live-side-effect enforcement.
- [ ] Implement reputation/twin/promotion and ensemble decisions with governance approval, conflict handling, rollback, and auditable evidence.
- [ ] Add EV01–EV08 tests for reproducibility, leakage prevention, failed run, timeout, resource exhaustion, promotion rejection, rollback, and tenant/agency scope.
- [ ] Exit criterion: evaluation and simulation produce decision-support evidence only, with promotion explicitly governed and reversible.

## Task 10: P09 — Recovery, tenancy, budget, performance, and launch gates

**Files:**

- \`backend/apps/**\`
- \`backend/deploy/**\`
- \`backend/tests/**\`
- \`docs/orchestration/**\`
- Runtime configuration and operational runbooks.

- [ ] Verify shutdown, restart, worker checkpoint recovery, outbox/inbox replay, graph rebuild, and partial dependency recovery.
- [ ] Verify tenant provisioning/deprovisioning, quotas, budget enforcement, retention, export, and deletion semantics without deleting authoritative audit evidence improperly.
- [ ] Run cross-module E2E scenarios for onboarding, governed inference, SIMULATED investment, reconciliation, billing/usage, operator recovery, and graph rebuild.
- [ ] Run performance/bench checks with documented dataset sizes, timeouts, resource ceilings, and observed results.
- [ ] Validate deployment manifests, health/readiness behavior, observability redaction, incident controls, and rollback procedure.
- [ ] Exit criterion: P09 gates pass with evidence, or each failing gate is explicitly recorded as blocked/non-authorized; no claim of production REAL readiness is made.

## Task 11: Final integration review and handoff

**Files:**

- All changed implementation files from the child issues.
- \`docs/orchestration/module-contract-matrix-23.md\`
- Phase acceptance matrices and runbooks created by authorized child issues.
- \`ANX-509\` and linked taskboard issues.

- [ ] Build the final requirement → canonical source → implementation symbol → test/command → result matrix for all 23 modules.
- [ ] Run the zero-tolerance scan for unfinished production code, placeholders, untracked TODOs, hardcoded sensitive values, silent catches, dead imports, and orphan files.
- [ ] Run \`bun run lint\`, \`tsc --build\`, targeted module/contract/integration tests, fresh-database tests, \`npm run graphify:check\`, and the applicable orchestration compliance gates.
- [ ] Request independent code/design review with ranked findings and resolve all blocking findings before acceptance.
- [ ] Update operational documentation for changed behavior, preserve ADR history, report residual risks, and link every phase result to its board issue.
- [ ] Move child issues to \`in_review\` only with evidence; move ANX-509 to \`in_review\` only after the program acceptance criteria are actually met. \`done\` requires explicit Owner/reviewer acceptance.

## Parallel Work Rules

- P01 is sequential and gates all later implementation.
- After P02, P03 can proceed in parallel with isolated contract work, but P04 depends on graph and identity/governance contracts.
- P04 and P05 can run in parallel after their public ports are stable.
- P06 may split into data/strategy, governance/risk/capital, execution/accounting, and audit/performance lanes, but integration tests must join them before phase acceptance.
- P07 can proceed in parallel with late P06 only for contracts that do not mutate P06-owned state.
- P08 depends on stable strategy/decision/simulation contracts.
- P09 is a hard launch gate and cannot be declared complete from unit tests alone.

## Improvements Included

- Treat completeness as a capability contract with executable evidence, not folder or route presence.
- Use one shared idempotency/conflict implementation and require every module to consume it.
- Make journal/outbox atomicity, projection rebuild, checkpoint/recovery, and UNKNOWN outcomes first-class acceptance gates.
- Separate authoritative PostgreSQL state from Neo4j projections, TimescaleDB series, pgvector retrieval, and local SQLite caches.
- Use a contract-first parallel delivery model with explicit owner domains and dependency barriers.
- Keep provider/engine adapters replaceable and SIMULATED by default while preserving the institutional authorization boundary.
- Add public API parity checks so backend capabilities without consumers become visible decisions rather than silent debt.
- Record evidence and residual risk per phase so production confidence is calibrated to what was actually executed.

## First Execution Slice

The next actionable slice is P02 foundation hardening:

1. Revalidate and claim the available migration issue ANX-470.
2. Execute fresh PostgreSQL bootstrap and migration replay.
3. Implement the missing migrations and atomic state/journal/outbox wiring within the owning modules.
4. Integrate conflicting idempotency payload behavior from ANX-474.
5. Close the identity/organizations tenancy path from ANX-460 and the PrincipalLookup decision from ANX-481.
6. Add the agency agents collection contract from ANX-496 only after confirming its issue is not concurrently claimed.
7. Report evidence, residual risks, and handoff before moving the child issue to review.

No implementation should begin from this master plan without a distinct claimed child issue and its context package.
