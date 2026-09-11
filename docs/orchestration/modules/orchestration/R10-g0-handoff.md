---
type: debate
---
# R10 — Pacote G0 (handoff): `modules/orchestration`

**Rodada:** R10 · 2026-09-11 · ANX-393 · pack ANX-389  
**Historico:** [structure R10](../../structure-debate/orchestration/R10-g0-handoff.md) se existir.  
**Status:** `draft`. Specs 002/006 **draft**. ANX-342 `todo`. **Nao** G1.

## In scope

| Area | Entrega |
| --- | --- |
| Dominio | Goal, Task, Run, TaskLease, RunHeartbeat, GateBinding, PlanRevision |
| Persistencia | PostgreSQL orchestration_* + journal + outbox (ADR0004) |
| Ports | AgentRegistryPort (agents), TraversalEvaluator T01 (graph) |
| API | `/v1/orchestration` esboco |
| Testes | G3-ORC-01..03; G5-ORC-01..03 |

## Out of scope

| Item | Dono |
| --- | --- |
| Agent / AgentVersion / skills | agents |
| Neo4j driver | graph |
| Provider secrets | connections |
| D-GOV-010 | risk P06 |
| Pastas projects / tasks / agent-teams | PC — **nao criar** |
| Ledger Dashi | board e espelho; fail-closed offline |
| G7 codigo / spec accepted | Owner |

## Non-goals

Dashi `in_review` ≠ gate PASS. Heartbeat nao concede grant. GateBinding nao substitui T01.

## Equipe G1 (nominal, futuro)

| Papel | Agente |
| --- | --- |
| Executor | backend-executor |
| Critico | backend-critic |

## Oraculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-ORC-01 | G3 | checkout atomico |
| G3-ORC-02 | G3 | heartbeat recusa lease expirado |
| G3-ORC-03 | G3 | Goal vive em PG, nao no board |
| G5-ORC-01 | G5 | lease cross-tenant 403 |
| G5-ORC-02 | G5 | T01 DENY |
| G5-ORC-03 | G5 | sem AgentRegistryPort fail-closed |

## Veredito P1

Pack G0 **documental completo**. **Nao** autoriza G1. Serial: packs restantes (evaluation/simulation ja neste ciclo).

## Saida R10

G0 debate aprovado para P1. ANX-393/389 evidencia — nao G7.
