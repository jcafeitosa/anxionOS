---
type: debate
---

# R05 — Armazenamento: `modules/performance`

**Issue:** ANX-105

## Decisão

**PostgreSQL** — OutcomeSnapshot, AttributionRun, OfficialMetricDefinition.
**TimescaleDB** — hypertables read-only: `performance_metric_points`, `performance_pnl_series` (rebuild idempotente; nunca fonte de saldo)

## Invariantes

| ID | Regra |
| --- | --- |
| PERF-R05-01 | PG autoritativo |
| PERF-R05-02 | Mutação+outbox mesma transação |
| PERF-R05-03 | RLS defer P09 |

→ **R06** ([R06-dependencies.md](./R06-dependencies.md))
