---
type: debate
---

# R05 — Armazenamento: `modules/billing`

**Issue:** ANX-103 · **ANX-104**

## Decisão

PostgreSQL subscriptions/invoices/refunds; Neo4j org→plan→invoice (projeção)

## Tabelas PG (autoritativas)

| Tabela | Chave | Idempotência / outbox |
| --- | --- | --- |
| `billing_subscriptions` | `(organization_id, subscription_id)` | command journal por `commandId` |
| `billing_invoices` | `(organization_id, invoice_id)` | `idempotency_key` único por org |
| `billing_invoice_lines` | `(invoice_id, usage_record_id)` | dedupe `connections.usage.recorded.v1` |
| `billing_refunds` | `(organization_id, refund_id)` | `idempotency_key`; emite `billing.refund.processed.v1` na mesma UoW |
| `billing_webhook_receipts` | `(provider, external_id)` | pagamento idempotente → `billing.invoice.paid.v1` |

## Invariantes

| ID | Regra |
| --- | --- |
| BIL-R05-01 | PG autoritativo |
| BIL-R05-02 | Mutação + outbox mesma transação |
| BIL-R05-03 | Usage line dedupe por `usageRecordId` (sem double-invoice) |
| BIL-R05-04 | Refund só após `invoice.paid`; reversal reflete em accounting projector |
| BIL-R05-05 | RLS defer P09 (application-only tenancy S1–S2) |

→ **R06** ([R06-dependencies.md](./R06-dependencies.md))
