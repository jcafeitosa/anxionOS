---
type: debate
---
# R03 — Esboço de domínio: `modules/billing`

**Rodada:** R3 — Domain model  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-103  
**Pré-requisito:** [R02-boundaries.md](./R02-boundaries.md) · thin debate billing  
**Callers:** [R04-contracts-events.md](./R04-contracts-events.md) · [ROUNDS.md](./ROUNDS.md). Sem schema de produção.

## Debate R3 (síntese atribuída)

**Arquiteto:** Agregados v1 — `BillingPlan`, `Subscription`, `UsageAggregation`, `Invoice` (+ linhas), `Refund`, `WebhookReceipt`.

**Executor:** `BillingUnitOfWork` (estado + journal + outbox). Consumer de usage é application, não domain.

**Crítico:** UsageAggregation idempotente por `usageRecordId`. Paid **não** escreve accounting internamente.

**Security:** WebhookReceipt chave `(provider, externalId)`; corpo cru não vai para grafo.

## Agregado: BillingPlan

Catálogo de plano da plataforma (limites lógicos, preço ref). Não é Product Company Product (PC 10).

| Campo | Notas |
| --- | --- |
| id | BillingPlanId |
| code | estável |
| revision | optimistic concurrency |

## Agregado: Subscription

Org-scoped. Status: `trial | active | past_due | canceled`. Sync via `organizations.subscription.changed.v1` **e** comandos billing.

**BIL-R03-01:** status paid/past_due deriva de Invoice, não de membership.

## Agregado: UsageAggregation

Rollup `(organizationId, billingPeriod, usageRecordId)`. **BIL-R03-02:** insert idempotente — replay do evento connections não double-invoice.

## Agregado: Invoice

`draft | issued | paid | voided`. Linhas apontam `usageRecordId` (UUID lógico connections — sem FK).

## Agregado: Refund

Só após `paid`. **BIL-R03-03:** `ProcessRefund` + `Idempotency-Key`; emite `billing.refund.processed.v1` na mesma UoW.

## Agregado: WebhookReceipt

Idempotência PSP. **BIL-R03-04:** replay mesmo `external_id` → 200 sem segundo `invoice.paid`.

## Ports (domain/)

| Port | Responsabilidade |
| --- | --- |
| SubscriptionRepository | lifecycle |
| InvoiceRepository | draft/issue/pay/void |
| RefundRepository | process |
| WebhookReceiptRepository | dedupe PSP |
| UsageAggregationRepository | dedupe usageRecordId |
| BillingUnitOfWork | estado + journal + outbox |
| AgencyScopePort | organizations |
| TraversalEvaluator | T01 `billing.*` |
| EventConsumerPort | usage + org subscription changed |
| PaymentProviderPort | infra — nunca secret no domain |

## Comandos application

| Comando | Idempotência | Evento |
| --- | --- | --- |
| UpsertSubscription | (organizationId, planId) | `billing.subscription.updated.v1` |
| AggregateUsage | usageRecordId | (interno; pode não emitir) |
| IssueInvoice | (organizationId, period) | `billing.invoice.issued.v1` |
| RecordInvoicePaid | webhook receipt | `billing.invoice.paid.v1` |
| ProcessRefund | Idempotency-Key | `billing.refund.processed.v1` |

## In / Out (R3)

**In:** AgencyScopePort; TraversalEvaluator T01 `billing.*`; EventConsumerPort (`connections.usage.recorded.v1`, `organizations.subscription.changed.v1`); PaymentProviderPort (infra — sem secret no domain).

**Out:** Subscription / Invoice / Refund / WebhookReceipt / UsageAggregation via BillingUnitOfWork; eventos `billing.subscription.updated.v1`, `billing.invoice.issued.v1`, `billing.invoice.paid.v1`, `billing.refund.processed.v1`. **Não** `accounting.journal.*` nem `partners.commission.*`.

## Non-goals

- Não persistir ledger de trading.
- Não chamar connections síncrono para InvoiceLine (D-CX-041).
- Não D-GOV-010 neste módulo.
- Não SQLite de cobrança.
- Não pasta marketplace/products.

## Oráculos

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-BIL-01 | G3 | Replay usageRecordId não cria segunda linha |
| G3-BIL-04 | G3 | Webhook replay → 200 sem segundo paid |
| G5-BIL-01 | G5 | GET invoice outra org → 403 |

## Saída R3

Modelo v1 aprovado para R4.
