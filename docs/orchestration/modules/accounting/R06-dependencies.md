---
type: debate
---
# R06 — Dependências: `modules/accounting`

**Rodada:** R6  
**Data:** 2026-09-11  
**Issues:** ANX-93 · ANX-91 · ANX-58 · ANX-29 · pack ANX-389  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [R07-risks.md](./R07-risks.md).

## In / Out (R6)

**In:** fill.confirmed (execution); reservation.consumed validação (capital); invoice.paid (billing); MarketDataPort; grant `accounting.adjust`; org scope; eventing P02.

**Out:** `accounting.ledger.posted.v1` → capital BalanceView; recon events → operations; todos `accounting.*` → audit. Sem mutate Invoice, Allocation, Observation ou Neo4j driver.

## Non-goals

D-GOV-010 = **risk P06**. Sem import `execution/infrastructure` nem `billing/infrastructure`. Sem spec `accepted`. Sem ST08 live. Sem ANX-342/389 `done`.

## Ownership (dependências)

| Superfície | Dono |
| --- | --- |
| JournalEntry | **accounting** |
| Fill | **execution** |
| Invoice | **billing** |
| Reservation | **capital** |
| adapter-gateway | **KEEP** |

## Upstream

| Componente | Contrato | Notas |
| --- | --- | --- |
| **execution** | `execution.fill.confirmed.v1` | Gatilho principal trade posting |
| **capital** | `capital.reservation.consumed.v1` (validação) | Não bloqueia posting se ordem já fill |
| **billing** | `billing.invoice.paid.v1` | Receita plataforma — defer até P07 billing debate |
| **market-data** | MarketDataPort read | priceRef em marcação |
| **governance** | `accounting.adjust` grant | Ajustes manuais |
| **organizations** | tenancy scope | orgId em todas as queries |
| packages/contracts, eventing | outbox/journal | P02 |

## Downstream

| Componente | Evento consumido |
| --- | --- |
| **capital** | `accounting.ledger.posted.v1` → BalanceView settled |
| **portfolios** | ledger + fills → posição reconciliada |
| **performance** | ledger + positions → P&L |
| **audit** | todos eventos accounting.* |
| **operations** | reconciliation.opened/resolved |

## Ordem bootstrap S1–S2 (ANX-94)

1. organizations G7 (ANX-29) ✅
2. capital S1 schema + contracts (ANX-92 após ANX-91 G7)
3. execution fill event stub (SIMULATED)
4. accounting S1: chart + journal schema + contracts skeleton
5. accounting S2: fill projector + `accounting.ledger.posted.v1`

## Bloqueadores conhecidos

- **execution** módulo `not_started` — S2 usa fixture `execution.fill.confirmed.v1` em testes até execution G1
- **billing** P07 — `postBillingRecognition` defer S4; contrato documentado em R04

→ **R07** ([R07-risks.md](./R07-risks.md))
