---
type: debate
---

# R04 — Contratos e eventos: `modules/simulation`

**Issues:** ANX-115 · **ANX-116**

## Convenções

`ownerDomain: simulation` · `simulation.<aggregate>.<action>.v1`

## HTTP `/v1/simulation/*`

| Método | Rota | Comando |
| --- | --- | --- |
| GET | `/` | list (scoped) |
| GET | `/:id` | getById |
| POST | `/` | create (Idempotency-Key) |

## Eventos emitidos

| `simulation.run.started.v1` | payload versionado | audit, downstream |
| `simulation.run.completed.v1` | payload versionado | audit, downstream |
| `simulation.snapshot.created.v1` | payload versionado | audit, downstream |

## Eventos consumidos

| eventType | Ação |
| --- | --- |
| `strategies.backtest.requested.v1` | projector principal |

## Erros

`SIM_DUPLICATE_IDEMPOTENCY` · `SIM_CROSS_TENANT` · `SIM_GRANT_INVALID`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
