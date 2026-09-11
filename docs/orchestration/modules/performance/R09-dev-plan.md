---
type: debate
status: draft
---
# R09 — Plano: `modules/performance`

**ANX-105** · impl **ANX-106** (não executada neste slice documental) · pack ANX-389  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md).

Árvore ADR0002 alvo: `backend/modules/performance/src/{domain,application,infrastructure,api}`. Não scaffoldar 23 módulos.

| Slice | Entrega | Gates |
| --- | --- | --- |
| S1 | schema + OfficialMetricDefinition | G2, G4 |
| S2 | dual projector ledger + position | G3 |
| S3 | OutcomeSnapshot + HTTP v1 | G3 |
| S4 | Timescale series + rebuild | G3 |
| S5 | graph consumer stub | G6 parcial |

## Matriz

G3-PERF-S2-01 ledger posted · G3-PERF-S2-02 position updated · G3-PERF-S2-03 stale reject · G3-PERF-S2-04 cross-tenant · G3-PERF-S4-01 rebuild idempotent · G5-PERF-01..03 ver R07.

Defer: Scalar público; RLS P09; D-GOV-010. P1 só pack G0. **Sem migration ST08.**

## Saída R9

Para R10.
