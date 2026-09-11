---
type: debate
---
# R04 — Contratos e eventos: `modules/accounting`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issues:** ANX-93 · ANX-58 · ANX-91 · pack ANX-389  
**Callers:** [R03-domain-sketch.md](./R03-domain-sketch.md) · [R05-storage-pg.md](./R05-storage-pg.md).

## Convenções

`ownerDomain: accounting` · `accounting.<aggregate>.<action>.v1` · `executionMode` SIMULATED|PAPER only · payloads sem segredos venue/pagamento

**KEEP adapter-gateway** se já exportado.

## In / Out (R4)

**In:** GET journal/balance; POST adjustments, reverse, reconciliation open/resolve. Idempotency-Key em POST; grant `accounting.*` + T01. Consumers: `execution.fill.confirmed.v1`, `billing.invoice.paid.v1`, `partners.commission.accrued.v1`, `capital.reservation.consumed.v1` (validação), `governance.grant.revoked.v1`.

**Out:** `accounting.ledger.posted.v1` → capital/portfolios/performance/audit. **Não** Invoice status (`billing`). **Não** hold de capital. **Não** tick persist (`market-data`). Sem secrets.

## Non-goals

Não REAL v1. Não SQLite ledger. Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não pasta `approvals/`.

## Ownership (contratos)

| Superfície | Dono |
| --- | --- |
| JournalEntry / LedgerPosting / FeePosting / ReconciliationCase financeiro | **accounting** |
| Invoice | **billing** |
| Reservation / Allocation | **capital** |
| Fill | **execution** |
| Observation | **market-data** |
| adapter-gateway | **KEEP** |

## HTTP `/v1/accounting/*` (v1 debate)

| Método | Rota | Comando |
| --- | --- | --- |
| GET | `/journal/:entryId` | getJournalEntry |
| GET | `/accounts/:code/balance` | getLedgerBalance (asOf) |
| POST | `/adjustments` | postAdjustment (grant required) |
| POST | `/entries/:id/reverse` | reverseEntry |
| POST | `/reconciliation-cases` | openReconciliationCase |
| POST | `/reconciliation-cases/:id/resolve` | resolveReconciliationCase |

Idempotency-Key obrigatório em POST; scope `organizationId` + grant `accounting.*`.

## Eventos emitidos v1

| eventType | Payload mínimo | Consumidores |
| --- | --- | --- |
| `accounting.ledger.posted.v1` | entryId, organizationId, capitalAccountId?, linesSummary[], valueDate | **capital**, portfolios, performance, audit |
| `accounting.fee.posted.v1` | feePostingId, fillId?, feeKind, amount | performance, audit |
| `accounting.reversal.posted.v1` | reversalEntryId, reversesEntryId | capital, audit |
| `accounting.reconciliation.opened.v1` | caseId, caseKind, sourceRefs[] | operations, audit |
| `accounting.reconciliation.resolved.v1` | caseId, resolution | audit |

## Eventos consumidos (accounting)

| eventType | Ação |
| --- | --- |
| `execution.fill.confirmed.v1` | projector → `postTradeFill` + fees |
| `billing.invoice.paid.v1` | projector → `postBillingRecognition` |
| `partners.commission.accrued.v1` | projector → expense/revenue lines |
| `capital.reservation.consumed.v1` | validação cruzada (não duplica posting de fill) |
| `governance.grant.revoked.v1` | bloqueia novos `postAdjustment` sob grant |

## Separação contratual (R02)

| Evento origem | accounting faz | accounting **não** faz |
| --- | --- | --- |
| `execution.fill.confirmed.v1` | JournalEntry trade + fees | Reservar capital |
| `billing.invoice.paid.v1` | Receita plataforma | Atualizar Invoice status |
| `market_data.observation.recorded.v1` | — (só referência em posting) | Persistir tick |
| `capital.reservation.created.v1` | — | Ledger hold |

## Erros institucionais

`ACC_UNBALANCED_ENTRY` · `ACC_DUPLICATE_IDEMPOTENCY` · `ACC_GRANT_INVALID` · `ACC_CROSS_TENANT` · `ACC_REAL_MODE_REJECTED` · `ACC_INVALID_PRICE_REF` · `ACC_ENTRY_ALREADY_REVERSED`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
