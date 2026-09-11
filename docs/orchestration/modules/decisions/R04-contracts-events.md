---
type: debate
---
# R04 — Contratos e eventos: `modules/decisions`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issues:** ANX-97 · ANX-58 · pack ANX-389  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md)  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [ROUNDS.md](./ROUNDS.md). Sem schema de produção neste artefato. API esboço `/v1/decisions` apenas.

## Convenções

`ownerDomain: decisions` · `decisions.<aggregate>.<action>.v1` · `executionMode` SIMULATED|PAPER only · payloads sem segredos venue

**KEEP adapter-gateway** se já exportado.

## In / Out (R4)

**In:** POST `/v1/decisions/proposals`, GET `/decisions/:id`, POST `check-authority`, POST `dispositions`, POST `/intents/:intentId/submit`, POST `cancel`. Idempotency-Key em POST; grant + T01. Consumers: `knowledge.evidence.recorded.v1`, `strategies.signal.emitted.v1`, `portfolios.rebalance.approved.v1`, `risk.check.completed.v1`, `governance.grant.revoked.v1`, `governance.authority_epoch.bumped.v1`, `capital.reservation.created.v1`.

**Out:** eventos `decisions.*` abaixo. **Não** emite `execution.order.*`. **Não** cria Grant (`governance`). **Não** reserva capital (só consome `reservation.created`). Sem secrets, prompts ou peppers.

## Non-goals

Não REAL/live v1. Não SQLite decisão. Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não pasta `approvals/` neste módulo.

## Ownership (contratos)

| Superfície | Dono |
| --- | --- |
| DecisionRecord / Proposal / TradeIntent / Disposition / AuthorityRef | **decisions** |
| Grant / Policy / ChangeProposal | **governance** |
| RiskCheck / Permit | **risk** |
| Reservation | **capital** |
| Order | **execution** |
| Evidence blob | **knowledge** |
| adapter-gateway | **KEEP** |

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
