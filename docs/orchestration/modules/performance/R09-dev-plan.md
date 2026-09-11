---
status: draft
type: debate
---

# R09 — Plano: `modules/performance`

**Rodada:** R9  
**Data:** 2026-09-11  
**ANX-105** · impl **ANX-106** (não executada neste slice documental) · pack ANX-389  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md). Plano **draft**.

## In / Out (R9)

**In:** slices S1–S5; matriz G3-PERF-S2-* / S4-01; schema OfficialMetricDefinition + dual projector.

**Out:** ordem de slices. **Não** ST08. **Não** ANX-389 `done`. Scalar público defer. RLS P09 defer. Ledger rewrite. Pasta `analytics/`.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não G7 ANX-106 neste pack. Não D-GOV-010. Não criar pasta `analytics/` (PC 22).

## Ownership (plano)

| Superfície | Dono |
| --- | --- |
| schema + dual projector | **performance** (ANX-106) |
| ledger events | **accounting** |
| position events | **portfolios** |
| adapter-gateway | **KEEP** |

## Debate R9

**Arquiteto:** dual projector (ledger posted + position updated) é o coração de S2; Timescale é série **derivada**, não saldo.

**Crítico:** rebuild S4 deve ser idempotente `(organizationId, snapshotId, revision)`. Fill de execution é cross-check — não substitui ledger.

Árvore ADR0002 alvo: `backend/modules/performance/src/{domain,application,infrastructure,api}`. Não scaffoldar 23 módulos.

| Slice | Entrega | Gates |
| --- | --- | --- |
| S1 | schema + OfficialMetricDefinition | G2, G4 |
| S2 | dual projector ledger + position | G3 |
| S3 | OutcomeSnapshot + HTTP v1 | G3 |
| S4 | Timescale series + rebuild | G3 |
| S5 | graph consumer stub | G6 parcial |

## Matriz

| ID | Caso |
| --- | --- |
| G3-PERF-S2-01 | ledger posted → outcome |
| G3-PERF-S2-02 | position updated → snapshot |
| G3-PERF-S2-03 | stale revision reject |
| G3-PERF-S2-04 | cross-tenant reject |
| G3-PERF-S4-01 | rebuild idempotente |
| G5-PERF-01 | cross-tenant metric 403 |
| G5-PERF-02 | rewrite de saldo via metric API recusado |
| G5-PERF-03 | ST04 SQLite local irrelevante |

## Defer

Scalar público; RLS P09; D-GOV-010; ST08; spec `accepted`. P1 só pack G0. **Sem migration ST08.**

## Saída R9

Para R10.
