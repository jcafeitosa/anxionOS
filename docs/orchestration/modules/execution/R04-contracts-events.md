---
type: debate
---
# R04 — Contratos e eventos: `modules/execution`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issues:** ANX-101 · ANX-58 · pack ANX-389  
**Callers:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [R05-storage-pg.md](./R05-storage-pg.md). API esboço interno apenas.

## Convenções

`ownerDomain: execution` · `execution.<aggregate>.<action>.v1` · SIMULATED|PAPER only · envelopes spec 001 · payloads sem secrets venue

**KEEP adapter-gateway** se já exportado.

## In / Out (R4)

**In:** `POST /execution/sessions` (intentHash + permits + reservation); `POST /execution/orders` (session OPEN + idempotencyKey); `POST /execution/fills` (simulator/adapter callback only); `POST /execution/reconciliation` (operator grant). Consumers: `decisions.intent.submitted.v1`, `risk.permit.issued.v1`, `governance.permit.granted.v1`, `capital.reservation.created.v1`, `risk.epoch.bumped.v1`, `risk.kill_switch.activated.v1`, `connections.binding.revoked.v1`.

**Out:** eventos `execution.*` abaixo. **Não** ledger (`accounting`). **Não** Position mutate síncrono (`portfolios` via evento). Sem api_key/secret/token em payload.

## Non-goals

Não REAL/LIVE_TRADING v1. Não SQLite order queue. Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não Go wire S1–S2.

## Ownership (contratos)

| Superfície | Dono |
| --- | --- |
| ExecutionSession / Order / Fill / VenueAdapterRef / ReconciliationCase | **execution** |
| TradeIntent | **decisions** |
| RiskPermit | **risk** |
| ExecutionPermit | **governance** |
| Reservation | **capital** |
| secretRef | **connections** |
| adapter-gateway | **KEEP** |

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
