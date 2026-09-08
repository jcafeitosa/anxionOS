---
type: debate
---

# R04 — Contratos e eventos: `modules/risk`

**Issues:** ANX-99 · ANX-58

## Convenções

`ownerDomain: risk` · SIMULATED|PAPER only

## Eventos emitidos v1

| eventType | Consumidores |
| --- | --- |
| `risk.check.completed.v1` | decisions, capital, execution, audit |
| `risk.permit.issued.v1` | capital, execution, audit |
| `risk.epoch.bumped.v1` | graph, execution, decisions |
| `risk.kill_switch.activated.v1` | operations, execution |

## Eventos consumidos

`decisions.intent.submitted.v1` · `portfolios.position.updated.v1` · `capital.reservation.created.v1`

## Erros

`RK_CROSS_TENANT` · `RK_CONFIG_REQUIRED` · `RK_PERMIT_STALE` · `RK_KILL_SWITCH_ACTIVE` · `RK_LIMIT_EXCEEDED`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
