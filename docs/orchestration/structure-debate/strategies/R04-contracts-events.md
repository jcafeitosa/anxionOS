---
type: debate
---

# R04 — Contratos e eventos: `modules/strategies`

**Issues:** ANX-89 · ANX-58 · ANX-87

## Convenções

`ownerDomain: strategies` · `strategies.<aggregate>.<action>.v1` · executionMode SIMULATED|PAPER only

## HTTP `/v1/strategies/*`

POST strategies, versions, publish, backtests, deployments, signals · GET backtest/signal

## Eventos v1

| eventType | Consumidores |
| --- | --- |
| strategies.version.published.v1 | graph, evaluation |
| strategies.backtest.requested.v1 | simulation (async backtest job) |
| strategies.backtest.completed.v1 | evaluation, simulation |
| strategies.deployment.activated.v1 | decisions, portfolios |
| strategies.signal.emitted.v1 | decisions, risk |

Consumer: `evaluation.certification.issued.v1`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
