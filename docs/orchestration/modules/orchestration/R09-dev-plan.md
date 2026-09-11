---
type: debate
---
# R09 — Plano de implementacao: `modules/orchestration`

**Rodada:** R9 · 2026-09-11 · ANX-393 / pack ANX-389  
**Implementacao:** issue distinta pos-greenlight Owner — **nao** neste pack.  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md).

## In scope (G1 futuro)

Schema PG `orchestration_*` (Goal, Task, Run, TaskLease, RunHeartbeat, GateBinding, PlanRevision, command journal), contratos, checkout UoW+outbox, heartbeat worker, HTTP `/v1/orchestration`, TaskboardMirror (espelho Dashi — **nao** ledger).

## Out of scope

AgentVersion (`agents`); T01 driver (`graph`); secrets (`connections`); D-GOV-010 (`risk` P06); pastas `projects/` `tasks/` `agent-teams/`; spec accepted; ST08 migration agora; ANX-342 done.

## Non-goals P1

So G0 documental. Dashi `in_review` **nao** e gate PASS. Nao scaffoldar 23 modulos.

## Pre-requisitos G1

| # | Gate | Evidencia |
| --- | --- | --- |
| 1 | R10 G0 | este pack |
| 2 | AgentRegistryPort | agents |
| 3 | T01 TraversalEvaluator | graph + governance |
| 4 | eventing | packages/eventing |
| 5 | AgencyScope | organizations |

## Arvore alvo

```text
backend/modules/orchestration/src/
  domain/  application/commands/  infrastructure/persistence/  api/  workers/  index.ts
```

## Fatias futuras

| Slice | Entrega | Criterio |
| --- | --- | --- |
| S1 | Schema PG | testes repo |
| S2 | Contracts Zod | events v1 |
| S3 | checkout UoW | G3-ORC-01 atomico |
| S4 | heartbeat worker | G3-ORC-02 recusa lease expirado |
| S5 | GateBinding | nao substitui T01 |
| S6 | HTTP | envelope |
| S7 | TaskboardMirror | espelho; fail-closed se board offline |

## Matriz oraculos

| ID | Caso |
| --- | --- |
| G3-ORC-01 | checkout atomico (lease+run+journal+outbox) |
| G3-ORC-02 | heartbeat recusa lease expirado |
| G3-ORC-03 | board Dashi nao e fonte de Goal |
| G5-ORC-01 | lease cross-tenant 403 |
| G5-ORC-02 | T01 DENY impede start run |
| G5-ORC-03 | invoke sem AgentRegistryPort fail-closed |

## Defer

D-GOV-010; OpenAPI publico; SSE Brain; G1.

## Saida R9

Plano documental para [R10](./R10-g0-handoff.md).
