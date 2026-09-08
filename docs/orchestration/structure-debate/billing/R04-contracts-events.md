---
type: debate
---

# R04 — Contratos e eventos: `modules/billing`

**Issues:** ANX-103 · **ANX-104**

## Convenções

`ownerDomain: billing` · `billing.<aggregate>.<action>.v1`

## HTTP `/v1/billing/*`

| Método | Rota | Comando |
| --- | --- | --- |
| GET | `/` | list (scoped) |
| GET | `/:id` | getById |
| POST | `/` | create (Idempotency-Key) |

## Eventos emitidos

| `billing.invoice.issued.v1` | payload versionado | audit, downstream |
| `billing.invoice.paid.v1` | payload versionado | audit, downstream |
| `billing.refund.processed.v1` | payload versionado | audit, downstream |

## Eventos consumidos (fonte autoritativa usage)

| eventType | Ação |
| --- | --- |
| `connections.usage.recorded.v1` | **UsageAggregator** — rollup por `(organizationId, billingPeriod, usageRecordId)`; materializa `InvoiceLine` sem chamar connections síncrono (D-CX-041) |
| `organizations.subscription.changed.v1` | sync `BillingPlan` / `Subscription` status |

### Fluxo invoice

1. connections emite `connections.usage.recorded.v1` na mesma UoW do insert PG
2. billing agrega período → `Invoice` draft + linhas
3. fechamento período → `billing.invoice.issued.v1`
4. webhook pagamento idempotente → `billing.invoice.paid.v1` → **accounting** projector

### Fluxo refund

1. comando `ProcessRefund` com `Idempotency-Key`
2. insert `billing_refunds` + outbox `billing.refund.processed.v1` (mesma UoW)
3. accounting consumer projeta reversal (downstream)

## Erros

`BIL_DUPLICATE_IDEMPOTENCY` · `BIL_CROSS_TENANT` · `BIL_GRANT_INVALID`

→ **R05** ([R05-storage-pg.md](./R05-storage-pg.md))
