---
type: debate
---

# R04 — Contratos e eventos: `modules/partners`

**Issues:** ANX-113 · **ANX-114**

## Convenções

`ownerDomain: partners` · `partners.<aggregate>.<action>.v1`

## Payout state machine

`SCHEDULED` → `PROCESSING` → `SETTLED` | `FAILED` | `REVERSED` — refund emite reversal de comissão.

## HTTP `/v1/partners/*`

| Método | Rota | Comando |
| --- | --- | --- |
| GET | `/` | list (scoped) |
| GET | `/:id` | getById |
| POST | `/` | create (Idempotency-Key) |

## Eventos emitidos

| eventType | Consumidores |
| --- | --- |
| `partners.commission.accrued.v1` | audit, accounting |
| `partners.payout.scheduled.v1` | audit, accounting |
| `partners.payout.settled.v1` | audit, accounting |
| `partners.payout.failed.v1` | audit, operations |
| `partners.commission.reversed.v1` | audit, accounting |

## Eventos consumidos

| eventType | Ação |
| --- | --- |
| `billing.invoice.paid.v1` | accrue commission |
| `billing.refund.processed.v1` | reverse commission (idempotent por refundId) |

## Erros

`PTR_DUPLICATE_IDEMPOTENCY` · `PTR_CROSS_TENANT` · `PTR_GRANT_INVALID` · `PTR_REFUND_ALREADY_REVERSED`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
