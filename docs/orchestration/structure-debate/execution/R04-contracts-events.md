---
type: debate
---

# R04 — Contratos e eventos: `modules/execution`

**Issues:** ANX-101 · ANX-58

## Convenções

`ownerDomain: execution` · SIMULATED|PAPER only · envelopes spec 001

## Eventos emitidos v1

| eventType | Consumidores |
| --- | --- |
| `execution.session.opened.v1` | audit, graph |
| `execution.order.submitted.v1` | capital, audit, graph |
| `execution.order.cancelled.v1` | capital, audit |
| `execution.fill.confirmed.v1` | accounting, portfolios, capital, audit, performance |
| `execution.fill.reversed.v1` | accounting, portfolios, audit |
| `execution.reconciliation.opened.v1` | operations, audit |
| `execution.adapter.suspended.v1` | connections, operations |

## Eventos consumidos

`decisions.intent.submitted.v1` · `risk.permit.issued.v1` · `governance.permit.granted.v1` · `capital.reservation.created.v1` · `risk.epoch.bumped.v1` · `risk.kill_switch.activated.v1` · `connections.binding.revoked.v1`

## Erros

`EX_CROSS_TENANT` · `EX_CONFIG_REQUIRED` · `EX_PERMIT_STALE` · `EX_PERMIT_BYPASS` · `EX_RESERVATION_INACTIVE` · `EX_DUPLICATE_FILL` · `EX_DUPLICATE_CLIENT_ORDER` · `EX_MODE_FORBIDDEN` · `EX_ADAPTER_SUSPENDED` · `EX_INTENT_MISMATCH`

## API sketch (internal module)

| Command | Validação mínima |
| --- | --- |
| `POST /execution/sessions` | intentHash + permits + reservation |
| `POST /execution/orders` | session OPEN + idempotencyKey |
| `POST /execution/fills` | simulator/adapter callback only |
| `POST /execution/reconciliation` | operator grant |

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
