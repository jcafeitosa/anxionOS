---
type: debate
---

# R03 — Esboço de domínio: `modules/billing`

**Issue:** ANX-103

## Agregados

Subscription, BillingPlan, Invoice, InvoiceLine, UsageAggregation, Refund, WebhookReceipt

## Nota

UsageAggregation idempotente por usageRecordId; InvoiceLine referencia usage sem duplicar source

## Ports

| Port | Uso |
| --- | --- |
| EventConsumerPort | connections.usage.recorded.v1 → aggregateUsage |
| EventEmitterPort | billing.invoice.issued.v1, billing.invoice.paid.v1, billing.refund.processed.v1 |

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
