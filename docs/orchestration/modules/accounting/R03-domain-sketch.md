---
type: debate
---

# R03 — Esboço de domínio: `modules/accounting`

**Rodada:** R3 · **Issues:** ANX-42 · **ANX-93**  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md)

## In / Out (R3)

**In:** esboço ChartOfAccounts, JournalEntry, LedgerPosting, FeePosting, ReconciliationCase.

**Out:** Invoice, Reservation, Fill, Observation — donos vizinhos.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-389 `done`. Sem código de produto.

## Ownership

| Superfície | Dono |
| --- | --- |
| Agregados de ledger | **accounting** |
| adapter-gateway | **KEEP** |

## Agregados

### ChartOfAccounts (per organization)

- `organizationId`, `baseCurrency`, `revision`
- Contas tipadas: `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`, `CLEARING`
- Invariante: código de conta único por org; contas sistema (`platform.*`, `trading.*`) seedadas no bootstrap S1

### JournalEntry

Unidade atômica de partida dobrada.

- `id`, `organizationId`, `entryKind` (`TRADE_FILL` | `FEE` | `BILLING_RECOGNITION` | `ADJUSTMENT` | `REVERSAL` | `PARTNER_COMMISSION`)
- `status`: `PENDING` → `POSTED` → `REVERSED` (terminal)
- `sourceRef`: `{ ownerDomain, aggregateId, eventId }` — ex.: `execution`, `fillId`, `execution.fill.confirmed.v1`
- `postedAt`, `valueDate`, `idempotencyKey`
- Invariante ACC-R02-INV-01: linhas balanceadas

### LedgerPosting (linha)

- `journalEntryId`, `accountCode`, `debit`, `credit`, `asset`, `amount`, `functionalCurrency`
- `priceRef?`: `{ observationId, asOf }` — referência market-data, não cópia de série
- `capitalAccountId?`, `portfolioId?` — dimensões analíticas, não ownership de saldo operacional

### FeeSchedule / FeePosting

- Taxas venue vs platform fee — agregados distintos (R01 Q4)
- `feeKind`: `VENUE` | `PLATFORM` | `REGULATORY_STUB`
- Vinculado a fill ou billing event; nunca duplicado em billing Invoice line como ledger

### ReconciliationCase (financeiro)

- `id`, `organizationId`, `caseKind` (`LEDGER_VS_CAPITAL` | `LEDGER_VS_EXECUTION` | `BILLING_VS_LEDGER`)
- `ownerDomain` fixo `accounting`; subtarefas referenciam execution/capital/billing por contrato
- Estados: `OPEN` → `INVESTIGATING` → `RESOLVED` | `ESCALATED`

### Reversal

- Novo JournalEntry referenciando `reversesEntryId`; nunca delete físico de posted entry

## Fluxo fill → lançamento (R01 Q2)

**Decisão:** **assíncrono projector** — execution emite `execution.fill.confirmed.v1`; accounting consumer valida idempotência e persiste JournalEntry + outbox `accounting.ledger.posted.v1` na mesma transação PG. Síncrono só em read-after-write de consulta, não no hot path de ordem.

## Ports

| Port | Uso |
| --- | --- |
| ExecutionConsumerPort | aplica fill events → draft postings |
| BillingConsumerPort | aplica `billing.invoice.paid.v1` |
| PartnersConsumerPort | aplica commission accrual events |
| MarketDataPort | `getPriceAsOf(observationId)` para marcação — read only |
| CapitalNotifyPort | emite `accounting.ledger.posted.v1` (outbox) |
| GovernancePort | valida capability `accounting.post` em ajustes manuais |

## Invariantes ACC-R03-INV-*

| ID | Regra |
| --- | --- |
| ACC-R03-INV-01 | Posted entry imutável — correção só via Reversal |
| ACC-R03-INV-02 | Idempotência: mesmo `idempotencyKey` → mesmo entryId |
| ACC-R03-INV-03 | Fill sem capitalAccountId válido → rejeição ou suspense account policy |
| ACC-R03-INV-04 | Billing posting exige invoiceId + paidAt do evento billing |
| ACC-R03-INV-05 | Manual adjustment exige grant `accounting.adjust` + audit reason code |
| ACC-R03-INV-06 | Nenhuma linha com débito e crédito > 0 simultaneamente |

## Commands (sketch)

`postTradeFill` · `postFee` · `postBillingRecognition` · `postAdjustment` · `reverseEntry` · `openReconciliationCase` · `resolveReconciliationCase`

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
