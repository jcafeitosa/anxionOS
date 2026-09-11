---
type: debate
status: draft
---
# R10 — Pacote G0 (handoff): `modules/performance`

**Rodada:** R10 · 2026-09-11  
**Issues:** debate ANX-105 · impl **ANX-106 nao executada** · pack ANX-389  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md).  
**Status:** `draft`. Spec 003 `draft`. ANX-342 `todo`. **Nao** G1.

## In scope

| Area | Entrega |
| --- | --- |
| Dominio | OfficialMetricDefinition, OutcomeSnapshot, AttributionRun, MetricSeries |
| Persistencia | PostgreSQL outcomes/atribuicao; **TimescaleDB series derivadas** (nao saldo) |
| Eventos | `performance.outcome.recorded.v1` (evaluation consome) |
| Testes | G3-PERF-* / G5-PERF-* |

## Out of scope

| Item | Dono |
| --- | --- |
| Ledger / taxas / reversao | accounting |
| Posicao canonica | portfolios |
| Fill autoritativo | execution (fill so cross-check PERF-R03-02) |
| Certification | evaluation |
| Pasta `analytics/` | PC 22 — **nao criar** |
| D-GOV-010 | risk P06 |
| ST08 / migrations agora | Owner + ANX-106 |

## Non-goals

Fill **nao** substitui ledger. Hypertable de P&L **nao** e fonte de capital. SQLite analise local **nao** sobrescreve metrica oficial.

## Oraculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-PERF-01 | G3 | outcome idempotente (command journal) |
| G3-PERF-02 | G3 | serie Timescale nao UPDATE accounting ledger |
| G3-PERF-03 | G3 | evaluation consome recorded; nao certifica aqui |
| G5-PERF-01 | G5 | cross-tenant metric 403 |
| G5-PERF-02 | G5 | rewrite de saldo via metric API recusado |
| G5-PERF-03 | G5 | ST04 SQLite local irrelevante |

## Ownership (fecho)

OfficialMetricDefinition, OutcomeSnapshot, AttributionRun, MetricSeries (Timescale **derivado**). Nao ledger, nao posicao.

## Veredito P1

Pack G0 documental. **Nao** autoriza G1. Pasta `analytics/` nao criar. D-GOV-010 = risk P06.

## Saida R10

Handoff G0 para P1. ANX-389 evidencia — nao G7.
