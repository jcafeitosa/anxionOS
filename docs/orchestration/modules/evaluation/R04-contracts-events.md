---
type: debate
---

# R04 — Contratos e eventos: `modules/evaluation`

**Issues:** ANX-109 · **ANX-110**

## Convenções

`ownerDomain: evaluation` · `evaluation.<aggregate>.<action>.v1`

## Lifecycle

simulation.run.completed / agents.version.published → EvaluationRecord → Certification → PromotionRecommendation → governance proposal (read-only)

## HTTP `/v1/evaluation/*`

| Método | Rota | Comando |
| --- | --- | --- |
| GET | `/` | list (scoped) |
| GET | `/:id` | getById |
| POST | `/` | create (Idempotency-Key) |

## Eventos emitidos

| eventType | Consumidores |
| --- | --- |
| `evaluation.score.computed.v1` | audit, performance |
| `evaluation.certification.issued.v1` | strategies, audit, graph |
| `evaluation.reputation.updated.v1` | audit, agents |
| `evaluation.promotion.recommended.v1` | governance, audit |

## Eventos consumidos

| eventType | Ação |
| --- | --- |
| `performance.outcome.recorded.v1` | scoring input |
| `simulation.run.completed.v1` | backtest certification trigger |
| `agents.version.published.v1` | agent certification trigger |

**Nota:** strategies consome `evaluation.certification.issued.v1` (não `recorded`).

## Erros

`EVL_DUPLICATE_IDEMPOTENCY` · `EVL_CROSS_TENANT` · `EVL_GRANT_INVALID`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
