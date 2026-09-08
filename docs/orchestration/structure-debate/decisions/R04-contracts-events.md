---
type: debate
---

# R04 — Contratos e eventos: `modules/decisions`

**Issues:** ANX-97 · ANX-58

## Convenções

`ownerDomain: decisions` · SIMULATED|PAPER only

## State machine TradeIntent

| Estado | Pré-condição emissão `intent.submitted` |
| --- | --- |
| `DRAFT` | — (não emite) |
| `PENDING_APPROVAL` | — (não emite) |
| `APPROVED` | disposition + independent approver |
| `RISK_PENDING` | risk.check.completed PASS |
| `CAPITAL_PENDING` | capital.reservation.created HELD |
| `SUBMITTED` | **único estado que emite** `decisions.intent.submitted.v1` |
| `CANCELLED` / `REJECTED` | terminal — sem submit |

**Invariante DC-R04-INV-01:** execution/capital consumers **rejeitam** `intent.submitted` se `status != SUBMITTED` ou epoch/grant stale.

## HTTP `/v1/decisions/*`

POST `/decisions/proposals` · GET `/decisions/:id` · POST `/decisions/:id/check-authority` · POST `/decisions/:id/dispositions` · POST `/intents/:intentId/submit` · POST `/decisions/:id/cancel`

## Eventos emitidos v1

| eventType | Consumidores | Gate emissão |
| --- | --- | --- |
| `decisions.proposal.created.v1` | audit, graph | propose |
| `decisions.decision.recorded.v1` | audit, graph, orchestration | record |
| `decisions.authority.checked.v1` | governance, audit | checkAuthority |
| `decisions.disposition.recorded.v1` | risk, audit | disposition (não execution) |
| `decisions.intent.submitted.v1` | execution, capital, audit | **SUBMITTED only** |

## Eventos consumidos

`knowledge.evidence.recorded.v1` · `strategies.signal.emitted.v1` · `portfolios.rebalance.approved.v1` · `risk.check.completed.v1` · `governance.grant.revoked.v1` · `governance.authority_epoch.bumped.v1` · `capital.reservation.created.v1`

## Erros

`DC_CROSS_TENANT` · `DC_AUTHORITY_STALE` · `DC_RISK_DENIED` · `DC_INTENT_IMMUTABLE` · `DC_REAL_MODE_REJECTED` · `DC_SUBMIT_PRECONDITION`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
