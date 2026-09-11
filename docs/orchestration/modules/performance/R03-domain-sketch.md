---
type: debate
---
# R03 — Esboço de domínio: `modules/performance`

**Issue:** ANX-105 · pack ANX-389  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [R04-contracts-events.md](./R04-contracts-events.md). Spec 003 **draft**.

## Agregados

| Agregado | Papel |
| --- | --- |
| OfficialMetricDefinition | Catálogo versionado (código, unidade, fórmula hash) |
| OutcomeSnapshot | P&L/NAV **oficial** asOfRevision + valuationVersion |
| AttributionRun | Atribuição strategy/agent; input hashes |
| MetricSeries | Pontos Timescale derivados — **não** saldo |

## Ports

| Port | Uso |
| --- | --- |
| PerformanceUnitOfWork | estado + journal + outbox |
| LedgerPostedConsumer | `accounting.ledger.posted.v1` |
| PositionUpdatedConsumer | `portfolios.position.updated.v1` |
| FillCrossCheckPort | `execution.fill.confirmed.v1` só reconciliação |
| TraversalEvaluator | T01 `performance.read` |
| AgencyScopePort | tenancy |

## Comandos

| Comando | Evento |
| --- | --- |
| RecordOutcomeSnapshot | `performance.outcome.recorded.v1` |
| PublishMetricSnapshot | `performance.metric.snapshot.v1` |
| ComputeAttribution | `performance.attribution.computed.v1` |
| RegisterMetricDefinition | `performance.metric_definition.published.v1` |

**PERF-R03-01:** rebuild projector idempotente. **PERF-R03-02:** fill NÃO substitui ledger para cash.

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> COMPUTED: ledger+position asOf
  COMPUTED --> PUBLISHED: OfficialMetricDefinition
  PUBLISHED --> SUPERSEDED: novo revision
```

## Saída R3

Para R4.
