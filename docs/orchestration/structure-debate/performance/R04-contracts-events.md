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

## Erros

`PERF_DUPLICATE_IDEMPOTENCY` · `PERF_CROSS_TENANT` · `PERF_GRANT_INVALID` · `PERF_STALE_POSITION`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
