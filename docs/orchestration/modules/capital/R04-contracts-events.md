---
type: debate
---

# R04 — Contratos e eventos: `modules/capital`

**Issues:** ANX-91 · ANX-58 · ANX-29 (organizations Owner)

## Convenções

`ownerDomain: capital` · `capital.<aggregate>.<action>.v1` · `executionMode` SIMULATED|PAPER only · payloads sem segredos venue

## HTTP `/v1/capital/*` (v1 debate)

| Método | Rota | Comando |
| --- | --- | --- |
| POST | `/accounts` | registerCapitalAccount |
| GET | `/accounts/:id` | getAccount + balance view |
| POST | `/accounts/:id/allocations` | proposeAllocation |
| POST | `/reservations` | reserveForIntent |
| POST | `/reservations/:id/release` | releaseReservation |
| GET | `/accounts/:id/available` | getAvailable (risk/decisions) |

Idempotency-Key obrigatório em POST; scope `organizationId` + grant `capital.*`.

## Eventos v1

| eventType | Payload mínimo | Consumidores |
| --- | --- | --- |
| `capital.account.registered.v1` | accountId, ownerUserId, baseCurrency | graph, audit |
| `capital.allocation.proposed.v1` | allocationId, grantId, portfolioId | graph, governance audit |
| `capital.allocation.activated.v1` | allocationId, revision, limitAmount | portfolios, risk |
| `capital.allocation.released.v1` | allocationId, reason | risk, audit |
| `capital.reservation.created.v1` | reservationId, intentHash, amount, asset | risk, decisions, audit |
| `capital.reservation.released.v1` | reservationId, reason | decisions, execution |
| `capital.reservation.consumed.v1` | reservationId, intentHash | execution, accounting |
| `capital.balance.snapshot.v1` | accountId, asOf, balances[] (redacted) | accounting reconcile, performance |

## Consumers (capital)

| eventType | Ação |
| --- | --- |
| `accounting.ledger.posted.v1` | atualiza `settledBalance` no BalanceView |
| `governance.grant.revoked.v1` | bloqueia novas reservas/allocation expand |
| `organizations.owner.verified.v1` | permite `ACTIVE` em conta pendente |

## accounting: snapshot vs delta (Q4)

**Decisão:** capital emite **lifecycle events** (reservation) + **balance.snapshot** periódico/pós-reconcile; accounting **não** depende só de snapshot — ledger continua fonte de settled.

## Erros institucionais

`CAP_INSUFFICIENT_AVAILABLE` · `CAP_GRANT_INVALID` · `CAP_CROSS_TENANT` · `CAP_DOUBLE_RESERVATION` · `CAP_REAL_MODE_REJECTED`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
