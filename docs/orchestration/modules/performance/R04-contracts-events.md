---
type: debate
---

# R04 — Contratos e eventos: `modules/performance`

**Issues:** ANX-105 · **ANX-106**

## Convenções

`ownerDomain: performance` · `performance.<aggregate>.<action>.v1`

## Fonte canônica P&L

| Input | Papel | Ordem rebuild |
| --- | --- | --- |
| `accounting.ledger.posted.v1` | realized P&L, cash flows | 1 — autoritativo para cash |
| `portfolios.position.updated.v1` | exposure / marked positions | 2 — NAV e attribution |
| `execution.fill.confirmed.v1` | opcional cross-check | 3 — reconciliação apenas |

`asOfRevision` + `valuationVersion` em OutcomeSnapshot; rebuild idempotente por `(organizationId, snapshotId, revision)`.

## HTTP `/v1/performance/*`

| Método | Rota | Comando |
| --- | --- | --- |
| GET | `/` | list (scoped) |
| GET | `/:id` | getById |
| POST | `/` | create (Idempotency-Key) |

## Eventos emitidos

| eventType | Consumidores |
| --- | --- |
| `performance.outcome.recorded.v1` | evaluation, audit |
| `performance.metric.snapshot.v1` | audit, Timescale projector |
| `performance.attribution.computed.v1` | audit, evaluation |

## Eventos consumidos

| eventType | Ação |
| --- | --- |
| `accounting.ledger.posted.v1` | projector realized metrics |
| `portfolios.position.updated.v1` | projector exposure/NAV |

## Timescale ownership

Hypertable `performance_metric_series` — owner **performance**; retention policy via operations (defer P07).

## Oráculos

| ID | Esperado |
| --- | --- |
| G3-PERF-01 | ledger.posted atualiza realized sem mutar accounting |
| G3-PERF-02 | position stale → PERF_STALE_POSITION |
| G3-PERF-03 | rebuild (org, snapshotId, revision) idempotente |
| G5-PERF-01 | replay ledger duplicate no-op |
| G5-PERF-02 | GET cross-tenant → 403 PERF_CROSS_TENANT |

## Alternativas rejeitadas

Timescale como saldo; fill como cash oficial; pasta `analytics/`.

## Saída R4

Contratos v1 para R5.
