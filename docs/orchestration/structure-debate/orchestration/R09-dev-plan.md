---
type: debate
---

# R09 — Plano de implementação: `modules/orchestration`

**Componente:** modules/orchestration  
**Rodada:** R9 — Plano de implementação G1  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issue debate estrutura:** ANX-46 · ANX-42 · ANX-44  
**Issue implementação:** derivada pós-greenlight (bloqueada até R10 G0 + identity G7 + organizations G1)  
**Sessão Slack:** [Session I — R09 dev-plan](./SLACK-TRANSCRIPTS.md#session-i--r09-dev-plan)

## Participantes

| Papel | Agente |
| --- | --- |
| Orquestrador | CTO orchestrator |
| Arquiteto | architect |
| Executor | code-architect |
| Crítico | critic-reviewer |
| Code Review | code-reviewer |
| QA | QA |
| Security | security-reviewer (Kai) |
| Red Team | Red Team (Ryn) |

## Objetivo da rodada

Traduzir R01–R08 (56 decisões `D-ORC-001`..`056`) em plano executável G1: árvore ADR0002, migrações PG, contratos `@anxionos/contracts/orchestration`, ordem de wiring workers/HTTP, matriz de testes G3/G5 e **fatias incrementais S1–S8** com critérios de aceite, gates e deferências S9.

**Ordem operacional ratificada (Session I):** schema PG (S1–S2) → checkout UoW (S3) → mirror taskboard (S4) → heartbeat/sweeper (S5) → gate disposition (S6) → HTTP `/v1/orchestration/*` (S7) → defer OpenAPI/G5 CI (S8/S9).

## Pré-requisitos (não implementar antes)

| # | Gate | Evidência |
| --- | --- | --- |
| 1 | R10 G0 aprovado | [R10-g0-handoff.md](./R10-g0-handoff.md) |
| 2 | P02 `@anxionos/eventing` | `ensureEventingSchema` no startup |
| 3 | identity G7 (ANX-28 `done`) | Export `getPrincipalById` + `PrincipalLookup` adapter |
| 4 | organizations G1 (ANX-39) | `OrganizationScopePort` + `getHierarchyMode` |
| 5 | graph consumer (ANX-32) | `graph:orchestration:gate:v1` projector |
| 6 | Env `TASKBOARD_WEBHOOK_SECRET` / HMAC prod | `.env.example`; `ORC_WEBHOOK_HMAC_REQUIRED` em prod |

**Nota:** ANX-28 e ANX-39 bloqueiam wiring integrado S6–S7, não este debate. R09 pode concluir enquanto dependências permanecem `in_review`.

---

## Árvore de diretórios (ADR0002)

```text
backend/modules/orchestration/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── src/
    ├── index.ts
    ├── domain/
    │   ├── entities/
    │   │   ├── goal.ts
    │   │   ├── task.ts
    │   │   ├── run.ts
    │   │   ├── task-lease.ts
    │   │   └── gate-binding.ts
    │   ├── events/
    │   │   └── orchestration-events.ts
    │   └── ports/
    │       ├── goal-repository.ts
    │       ├── task-repository.ts
    │       ├── run-repository.ts
    │       ├── task-lease-repository.ts
    │       ├── gate-binding-repository.ts
    │       ├── command-journal.ts
    │       ├── principal-lookup.ts
    │       ├── organization-scope.ts
    │       ├── traversal-evaluator.ts
    │       ├── graph-query.ts
    │       ├── taskboard-mirror.ts
    │       ├── agent-registry.ts
    │       └── orchestration-unit-of-work.ts
    ├── application/
    │   ├── commands/
    │   │   ├── checkout-task.ts
    │   │   ├── renew-task-lease.ts
    │   │   ├── release-task-lease.ts
    │   │   ├── record-gate-disposition.ts
    │   │   ├── ingest-taskboard-webhook.ts
    │   │   └── sync-taskboard-status.ts
    │   ├── queries/
    │   │   ├── get-task.ts
    │   │   ├── get-run.ts
    │   │   └── list-gate-bindings-by-issue.ts
    │   └── services/
    │       ├── assert-orchestration-scope.ts
    │       ├── validate-mirror-transition.ts
    │       └── hierarchy-mode-resolver.ts
    └── infrastructure/
        ├── adapters/
        │   ├── identity-principal-lookup.ts
        │   ├── organizations-scope-adapter.ts
        │   ├── governance-traversal-adapter.ts
        │   ├── graph-query-adapter.ts
        │   ├── dashi-taskboard-mirror.ts
        │   └── permissive-agent-registry.ts
        ├── persistence/
        │   ├── schema.ts
        │   ├── goal-repository.ts
        │   ├── task-repository.ts
        │   ├── run-repository.ts
        │   ├── task-lease-repository.ts
        │   ├── gate-binding-repository.ts
        │   ├── command-journal-repository.ts
        │   ├── taskboard-mirror-repository.ts
        │   └── run-heartbeat-repository.ts
        ├── orchestration-unit-of-work.ts
        ├── create-db.ts
        ├── migrate.ts
        └── migrations/
            ├── 0000_orchestration_core.sql
            ├── 0001_orchestration_lease_heartbeat_indexes.sql
            └── meta/

backend/packages/contracts/src/orchestration/
├── types.ts
├── commands.ts
├── queries.ts
├── events.ts
├── errors.ts
├── gate-binding/
│   └── 1.0.0/
│       └── schema.ts
└── index.ts

backend/apps/api/src/orchestration/
├── plugin.ts
├── middleware/
│   ├── require-orchestration-scope.ts
│   ├── verify-taskboard-hmac.ts
│   └── idempotency-key.ts
└── handlers/
    ├── checkout.ts
    ├── lease.ts
    ├── gates.ts
    ├── tasks.ts
    ├── runs.ts
    └── taskboard.ts

backend/apps/workers/src/orchestration/
├── taskboard-sync.ts
├── heartbeat-dequeue.ts
└── lease-sweeper.ts

backend/tests/
├── contracts/orchestration/
├── orchestration/
│   ├── unit/
│   └── integration/
├── boundary/
│   └── orchestration-imports.test.ts
└── fixtures/
    └── orchestration-g5-sandbox.json
```

**Fora do escopo G1 (defer S8/S9):** `PlanRevision` migration 0002 (D-ORC-055), OpenAPI Scalar público (D-ORC-054), G5 automatizado CI sandbox (D-ORC-056), `AgentRegistryPort` forte (D-ORC-053), saga agents wakeup (P-R6-05).

---

## Migrações Drizzle

| # | Arquivo | Conteúdo |
| --- | --- | --- |
| **0000** | `0000_orchestration_core.sql` | Enums + `orchestration_goals`, `orchestration_tasks`, `orchestration_runs`, `orchestration_task_leases`, `orchestration_run_heartbeats`, `orchestration_gate_bindings`, `orchestration_command_journal`, `orchestration_taskboard_mirror` |
| **0001** | `0001_orchestration_lease_heartbeat_indexes.sql` | Índices parciais lease ativo, heartbeat pending, gate PASS vigente, mirror dedupe |

**Bootstrap:** `ensureEventingSchema` → `ensureIdentitySchema` → `ensureOrganizationsSchema` → `ensureOrchestrationSchema` (D-ORC-038).

**Defer S9:** `0002_orchestration_plan_revisions.sql` — somente após go/no-go PlanRevision P1.

---

## Startup: fail-fast e bootstrap

| Regra | Comportamento |
| --- | --- |
| `ORC_WEBHOOK_HMAC_REQUIRED=true` em prod | Webhook sem assinatura válida → 401 (D-ORC-051) |
| T01 timeout 2s | `503 ORC_GOVERNANCE_UNAVAILABLE` — checkout deny (D-ORC-036) |
| Circuit breaker T01 open 30s | Checkout/renew deny até half-open (D-ORC-050) |
| `TASKBOARD_URL` ausente | Worker polling desabilitado; webhook-only com warn |
| Board `done` sem G7 PASS | `ORC_MIRROR_REJECTED` — sem side effect (D-ORC-045) |
| `leaseToken` | Só resposta HTTP checkout/renew — nunca evento/log (D-ORC-026) |

Ordem composition root: schemas PG → montar adapters ports → rotas `/v1/orchestration` → registrar workers NATS.

---

## `packages/contracts/src/orchestration/`

| Arquivo | Responsabilidade |
| --- | --- |
| `types.ts` | Enums, branded IDs, `HierarchyMode`, gate IDs |
| `gate-binding/1.0.0/schema.ts` | `gateBindingV1Schema` normativo (D-ORC-020) |
| `commands.ts` | `checkoutTask`, `renewTaskLease`, `recordGateDisposition`, webhook ingest |
| `queries.ts` | `getTask`, `getRun`, `listGateBindingsByIssue` |
| `events.ts` | 6 eventos v1 + mapa `eventType → schema` (D-ORC-021) |
| `errors.ts` | `ORC_*` codes (D-ORC-022) |
| `index.ts` | Re-export público |

### Códigos de domínio (`errors.ts`)

| Código | HTTP |
| --- | --- |
| `ORC_TASK_NOT_FOUND` | 404 |
| `ORC_RUN_NOT_FOUND` | 404 |
| `ORC_LEASE_CONFLICT` | 409 |
| `ORC_LEASE_EXPIRED` | 409 |
| `ORC_CHECKOUT_DENIED` | 409 |
| `ORC_GATE_REVIEWER_MISMATCH` | 403 |
| `ORC_MIRROR_REJECTED` | 409 |
| `ORC_SCOPE_DENIED` | 403 |
| `ORC_GOVERNANCE_UNAVAILABLE` | 503 |
| `ORC_IDENTITY_UNAVAILABLE` | 503 |
| `ORC_IDEMPOTENT_REPLAY` | 200 |

---

## Wiring — ordem de implementação

| Ordem | Componente | Slice |
| --- | --- | --- |
| 1 | Contracts orchestration + gate-binding 1.0.0 | S1 |
| 2 | PG migrations 0000–0001 + `ensureOrchestrationSchema` | S1 |
| 3 | Domain entities + ports | S2 |
| 4 | Persistence repos + UoW + command journal | S2 |
| 5 | `checkoutTask` UoW transacional + `checked_out.v1` | S3 |
| 6 | `renewTaskLease` / `releaseTaskLease` + `timingSafeEqual` | S3 |
| 7 | Mirror webhook + dedupe + `validateMirrorTransition` | S4 |
| 8 | Worker `taskboard-sync` polling 60s (leases ativos) | S4 |
| 9 | Heartbeat enqueue/dequeue + coalesce 30s | S5 |
| 10 | Worker `lease-sweeper` batch 100 + jitter | S5 |
| 11 | `recordGateDisposition` + invalidação PASS | S6 |
| 12 | Adapters identity/org/governance/graph | S6 |
| 13 | HTTP 10 rotas `/v1/orchestration/*` | S7 |
| 14 | OpenAPI Scalar + G5 CI + plan_revisions | S8/S9 defer |

---

## Matriz de testes

### Unitários

| Teste | Foco | Slice |
| --- | --- | --- |
| `gate-binding-v1.test.ts` | N/A exige `notApplicableReason`; digest pattern | S1 |
| `checkout-task.test.ts` | idempotência `(agentId, taskId)`; board ≠ `in_progress` deny | S3 |
| `renew-task-lease.test.ts` | `timingSafeEqual`; cap TTL 8h | S3 |
| `validate-mirror-transition.test.ts` | `done` sem G7 → reject | S4 |
| `taskboard-dedupe.test.ts` | PK `(issue, version, status)` no-op | S4 |
| `heartbeat-coalesce.test.ts` | `coalesce_key` unique pending | S5 |
| `lease-sweeper.test.ts` | batch 100; orphan → `run.orphaned.v1` | S5 |
| `record-gate-disposition.test.ts` | G7 Owner only; invalida PASS anterior | S6 |
| `hierarchy-mode-resolver.test.ts` | TREE vs CIRCULAR binding payload | S6 |

### Contratos (`backend/tests/contracts/orchestration/`)

Round-trip Zod: types, gate-binding 1.0.0, commands, events, errors.

### Integração

| Teste | Foco | Slice |
| --- | --- | --- |
| `checkout-uow-journal-outbox.test.ts` | COMMIT atômico lease+run+journal+outbox; rollback P-R5-05 | S3 |
| `mirror-webhook-hmac.test.ts` | HMAC válido/inválido; prod flag | S4 |
| `taskboard-sync-polling.test.ts` | board offline 90s → recupera `in_progress` | S4 |
| `heartbeat-dequeue-pg.test.ts` | ack pós-processamento; cap 10k/org | S5 |
| `gate-disposition-outbox.test.ts` | evento `gate.disposition.recorded.v1` redacted | S6 |

### G3 (funcional)

| ID | Cenário | Esperado | Slice |
| --- | --- | --- | --- |
| G3-01 | Checkout board `todo` | `ORC_CHECKOUT_DENIED` | S7 |
| G3-02 | Checkout board `in_progress` + T01 ALLOW | 200 + `leaseToken` | S7 |
| G3-03 | Replay `Idempotency-Key` checkout | `idempotentReplay: true` | S7 |
| G3-04 | Mirror webhook `done` sem G7 | `ORC_MIRROR_REJECTED` | S7 |
| G3-05 | G7 PASS com `reviewerId` ≠ Owner | `ORC_GATE_REVIEWER_MISMATCH` | S7 |
| G3-06 | Lease renew em `in_review` | 200 até cap 8h (D-ORC-052) | S7 |
| G3-07 | Heartbeat coalesce 30s | uma row pending por `coalesce_key` | S5 |
| G3-08 | Sweeper 500 leases expirados | ≤5 batches (ORCH-R07-05) | S5 |
| G3-09 | `NOT_APPLICABLE` sem reason | 400 `ORC_GATE_NA_REASON_REQUIRED` | S7 |
| G3-10 | T01 timeout 2s | `503 ORC_GOVERNANCE_UNAVAILABLE` | S7 |

### G5 Red Team (sandbox)

**Orçamento:** PG dev + taskboard loopback; sem produção.  
**Cleanup:** `TRUNCATE orchestration_* CASCADE;` + fixture reset.  
**Fixture:** `backend/tests/fixtures/orchestration-g5-sandbox.json` — `principalOwner`, `principalAgent`, `agencyX`, tasks `ANX-901`/`ANX-902`, IDs sanitizados.

| ID | Cenário | Esperado | Slice |
| --- | --- | --- | --- |
| G5-01 | Spoof webhook `done` sem G7 | `ORC_MIRROR_REJECTED`; zero lease release | S7 |
| G5-02 | G7 PASS forjado por agente não-Owner | 403; binding não persistido | S7 |
| G5-03 | Renew com `lease_token` de outro agente | 409 `ORC_LEASE_CONFLICT` | S7 |
| G5-04 | Heartbeat flood 20k/org | backpressure acima 10k (D-ORC-048) | S5 |
| G5-05 | Idempotency body mismatch replay | rejeição hash mismatch | S7 |
| G5-06 | Cross-tenant `organizationId` path tamper | `ORC_SCOPE_DENIED` | S7 |
| G5-07 | Webhook prod sem HMAC com flag required | 401 | S7 |
| G5-08 | `leaseToken` em payload evento checked_out | schema/event test fail | S3 |

Checklist R07 G5 (20 itens) — executar manualmente sandbox local antes de claim implementação; automação CI → S8 (D-ORC-056).

### AR01 (`boundary/orchestration-imports.test.ts`)

Proíbe: módulo→`identity/infrastructure/**`, módulo→`organizations/infrastructure/**`, módulo→Neo4j/NATS/Drizzle em `domain/`, import cross-module repos privados.

### Bench (targets dev-plan)

| Métrica | Target dev | Evidência |
| --- | --- | --- |
| Checkout p99 latência | ≤ 120ms local | S7 bench script |
| T01 eval `t01_eval_duration_ms` p99 | ≤ 2s warning | S6 metrics |
| Mirror dedupe webhook+polling | zero double-apply | S4 integration |
| Sweeper 500 orphans | ≤ 5 batches observáveis | S5 integration |

---

## Fases (8 slices + defer)

| Slice | Pré-requisito | Evidência mínima | Bloqueio se ausente |
| --- | --- | --- | --- |
| **S1** | R10 G0 aprovado; debate R09 fechado | contracts orchestration skeleton; migrations 0000–0001; `ensureOrchestrationSchema` idempotente; gate-binding 1.0.0 Zod | S2 — contracts drift |
| **S2** | S1 completo | domain entities + ports sem framework; repos PG; command journal; UoW interface | S3 — persistência instável |
| **S3** | S2 completo; eventing NATS | checkout/renew/release UoW; `checked_out.v1` sem `leaseToken`; P-R5-05 rollback test; G5-08 | S4 — sem lease confiável |
| **S4** | S3 completo | mirror webhook HMAC; dedupe table; `validateMirrorTransition`; worker polling 60s; G3-04 parcial | S5/S7 — board drift |
| **S5** | S4 completo | heartbeat coalesce 30s; cap 10k/org; sweeper batch 100+jitter; G3-07/G3-08 | S7 — orphans não recuperados |
| **S6** | S5 completo; ANX-28 G7 wiring; ANX-39 scope | `recordGateDisposition`; adapters T01/identity/org/graph; invalidação PASS; G3-05/G3-09 | S7 — G7/mirror incompletos |
| **S7** | S6 completo | HTTP 10 rotas; middleware scope+HMAC+idempotency; matriz G3-01..06, G3-10 + G5-01..07 executada; fixture G5 | G1 não fecha |
| **S8** | S7 completo | `npm run contracts:openapi` documentado; G5 CI sandbox spec; bench checkout p99 | defer OK pós-G1 |
| **S9** | S8 completo | migration 0002 plan_revisions OU rejeição formal; `AgentRegistryPort` forte critérios | defer P1 |

**Ordem operacional ratificada (Session I):** PG (S1–S2) → checkout (S3) → mirror (S4) → heartbeat (S5) → gates+adapters (S6) → HTTP (S7).

### Slice 1 — Contratos e schema PG

**AC:** enums/errors R04; `gateBindingV1Schema` 1.0.0; migrations 0000–0001; `ensureOrchestrationSchema` idempotente; 6 eventos mapa v1.

### Slice 2 — Domínio, ports e persistência

**AC:** entities Goal/Task/Run/Lease/GateBinding; ports sem framework; repos com `organizationId`; command journal hash; UoW transacional.

### Slice 3 — Checkout e lease (Paperclip core)

**AC:** `checkoutTask` TX única FOR UPDATE; idempotência `(agentId, taskId)`; renew `timingSafeEqual`; `leaseToken` só HTTP; evento checked_out redacted; teste P-R5-05 rollback.

### Slice 4 — Mirror taskboard

**AC:** webhook ingest + HMAC opcional/dev; dedupe `(issue, boardVersion, status)`; polling worker leases ativos; `done`/`canceled` valida G7 em PG; board→orch unidirecional.

### Slice 5 — Heartbeat e sweeper

**AC:** fila PG `orchestration_run_heartbeats`; coalesce 30s; dequeue worker; sweeper orphan batch 100 + jitter 0–30s; cap fila 10k/org backpressure.

### Slice 6 — Gate disposition e adapters upstream

**AC:** `recordGateDisposition` append-only; invalidação PASS por digest; G7 Owner via `PrincipalLookup`; T01 fail-closed 2s; CIRCULAR payload completo para graph; `ExplainEscalationPath` read-only.

### Slice 7 — HTTP `/v1/orchestration/*`

**AC:** 10 rotas R04; middleware scope + idempotency + HMAC prod flag; rate limit webhook 60/min/IP; matriz G3/G5 executada; fixture `orchestration-g5-sandbox.json`.

### Slice 8 — Deferências documentais (pós-G1)

**AC:** OpenAPI Scalar paths públicos vs admin; spec job G5 CI sandbox (D-ORC-056); comando openapi documentado; **não** implementar auto-replay nem PlanRevision sem ADR.

**Fixture registry (obrigatório):** `backend/tests/fixtures/orchestration-g5-sandbox.json` — Owner, agent, agency, issues ANX-901/902, gate bindings mínimos para G3/G5.

---

## Spike G5 CI sandbox — go/no-go (S8 / ORCH-R09-03)

| Critério | Go CI sandbox | No-go (manual Red Team only) |
| --- | --- | --- |
| Fixture determinística commitada | `orchestration-g5-sandbox.json` verde | **Rejeitar** CI até fixture |
| Taskboard loopback em CI | Container ou mock HTTP estável | Manual local only |
| HMAC prod flag testável | env inject em job | Skip G5-07 em CI |
| Cleanup truncate idempotente | script `tests/orchestration/cleanup.sql` | Flaky suites |

**Decisão default v1:** G5 manual sandbox local obrigatório (ORCH-R07-08); automação CI especificada em S8 sem prometer merge gate até evidência.

---

## Mapa D-ORC → arquivos (resumo)

| Decisão | Arquivo(s) |
| --- | --- |
| D-ORC-001..004 | goal.ts, task.ts, hierarchy-mode-resolver.ts |
| D-ORC-005..012 | checkout-task.ts, task-lease.ts, record-gate-disposition.ts |
| D-ORC-013..019 | renew-task-lease.ts, validate-mirror-transition.ts |
| D-ORC-020..027 | gate-binding/1.0.0/schema.ts, events.ts, gates.ts |
| D-ORC-028..033 | schema.ts, migrations/0000, taskboard-mirror-repository.ts |
| D-ORC-034..039 | principal-lookup.ts, organization-scope.ts, dashi-taskboard-mirror.ts |
| D-ORC-040..043 | events.ts (publish only); workers/* |
| D-ORC-044..049 | checkout-task.ts, lease-sweeper.ts, validate-mirror-transition.ts |
| D-ORC-050..053 | governance-traversal-adapter.ts, verify-taskboard-hmac.ts |
| D-ORC-054..056 | S8 defer doc; este plano |

---

## Top 5 arquivos a criar primeiro

1. `backend/packages/contracts/src/orchestration/errors.ts`
2. `backend/packages/contracts/src/orchestration/gate-binding/1.0.0/schema.ts`
3. `backend/modules/orchestration/src/infrastructure/persistence/schema.ts`
4. `backend/modules/orchestration/src/infrastructure/migrations/0000_orchestration_core.sql`
5. `backend/modules/orchestration/src/application/commands/checkout-task.ts`

---

## Dependências externas por slice

| Slice | Upstream | Downstream impactado |
| --- | --- | --- |
| S1–S2 | eventing, database packages | — |
| S3 | governance T01 (mock OK em testes módulo) | agents wakeup saga (defer) |
| S4 | Dashi taskboard loopback | audit mirror events |
| S5 | — | operations orphan metrics |
| S6 | identity G7; organizations scope; graph read | graph `graph:orchestration:gate:v1` |
| S7 | todos adapters reais | apps/api composition |
| S8 | Scalar/Elysia tooling | CI pipeline |

---

## Decisões R09

| ID | Decisão | Status |
| --- | --- | --- |
| **ORCH-R09-01** | 8 slices S1–S8; ordem PG→checkout→mirror→heartbeat→gates→HTTP | ✅ Aceito |
| **ORCH-R09-02** | Fixture `orchestration-g5-sandbox.json` obrigatória S7 | ✅ Aceito |
| **ORCH-R09-03** | G5 CI sandbox spec S8; manual local permanece gate ORCH-R07-08 | ✅ Aceito |
| **ORCH-R09-04** | OpenAPI + plan_revisions 0002 + AgentRegistry forte defer S8/S9 | ✅ Aceito |

---

## Saída R9

✅ Plano aprovado para **R10** (pacote G0) e execução pós-greenlight.

**P-R7-04:** ✅ Especificado (G5 CI S8).  
**P-R5-05:** ✅ Alocado S3 (`checkout-uow-journal-outbox.test.ts`).  
**ORCH-R08-03:** ✅ Alocado S4 (webhook HMAC + worker sync).
