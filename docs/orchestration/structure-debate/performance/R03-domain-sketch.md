---
type: debate
---

# R03 — Esboço de domínio: `modules/performance`

**Issue:** ANX-105

## Agregados

OutcomeSnapshot, MetricSeries, AttributionRun, OfficialMetricDefinition

## Nota

OfficialMetricDefinition versionada; rebuild projector idempotente

## Ports

| Port | Uso |
| --- | --- |
| EventConsumerPort | accounting.ledger.posted.v1 + portfolios.position.updated.v1 |
| EventEmitterPort | performance.outcome.recorded.v1, performance.metric.snapshot.v1, performance.attribution.computed.v1 |

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
