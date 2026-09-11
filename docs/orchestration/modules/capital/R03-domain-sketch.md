---
type: debate
---

# R03 — Esboço de domínio: `modules/capital`

**Rodada:** R3 · **Issues:** ANX-42 · **ANX-91**  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md)

## In / Out (R3)

**In:** esboço CapitalAccount, Allocation, CapitalReservation, BalanceView.

**Out:** Grant, JournalEntry, Order, TradeIntent.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Agregados de capital | **capital** |
| adapter-gateway | **KEEP** |

## Agregados

### CapitalAccount

- `id`, `organizationId`, `ownerUserId` (titular verificado)
- `externalAccountRef` (nullable v1 SIMULATED)
- `baseCurrency`, `accountKind` (`CASH` | `MARGIN_STUB` defer)
- `status`: `PENDING_VERIFICATION` → `ACTIVE` → `SUSPENDED` → `CLOSED`
- Invariante: Agency da org só registra conta com `ownerUserId` da org

### Allocation

Mandato/limite de uso — **não** duplica saldo.

- `id`, `capitalAccountId`, `portfolioId`, `strategyDeploymentId?`, `grantId`
- `limitAmount`, `limitCurrency`, `revision`
- Estados: `PROPOSED` → `RESERVED` → `ACTIVE` → `RELEASING` → `CLOSED` | `REJECTED`

### CapitalReservation

Hold transacional para intenção/ordem (spec 003 reserve step).

- `id`, `capitalAccountId`, `portfolioId`, `intentHash`, `tradeIntentId?`
- `asset`, `amount`, `reservationKind` (`ORDER` | `FEE_BUFFER` | `MARGIN`)
- `status`: `HELD` → `CONSUMED` | `RELEASED` | `EXPIRED`
- `expiresAt` obrigatório para ORDER

### BalanceView (read model)

- `capitalAccountId`, `asOf`, `settledBalance` (por asset)
- `encumbrances`, `pendingReservations`
- `available = settled − encumbrances − pending` (por asset; FX via port para base)

## Relação conta ↔ portfolio

Uma **CapitalAccount** financia **N portfolios** do mesmo Owner via subledger; cap disponível é **global da conta** (CAP-R02-INV-02).

## Ports

| Port | Uso |
| --- | --- |
| OrganizationsPort | resolve Owner, valida Agency scope |
| GovernancePort | `validateGrant(grantId, capability, epoch)` |
| MarketDataPort | `getFxRateAsOf` para available em baseCurrency |
| AccountingConsumerPort | aplica `accounting.ledger.posted.v1` → atualiza settled |
| ReservationQueryPort | export para risk/decisions (`getReservations`, `getAvailable`) |

## Invariantes CAP-R03-INV-*

| ID | Regra |
| --- | --- |
| CAP-R03-INV-01 | Reserva HOLD soma ≤ available no asset (transação serializável por account) |
| CAP-R03-INV-02 | Duas reservas concorrentes: no máximo uma passa se soma > available (FI02) |
| CAP-R03-INV-03 | Allocation ACTIVE exige grant válido e revision monotônica |
| CAP-R03-INV-04 | Consumo de reserva exige `intentHash` estável |
| CAP-R03-INV-05 | unsettled cash não entra em `available` sem policy explícita |

## Commands (sketch)

`registerCapitalAccount` · `proposeAllocation` · `reserveForIntent` · `releaseReservation` · `consumeReservation` · `verifyAccountOwner`

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
