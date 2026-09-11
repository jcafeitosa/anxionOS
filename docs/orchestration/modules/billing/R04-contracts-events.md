---
type: debate
---
# R04 — Contratos, API e eventos: `modules/billing`

**Rodada:** R4  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-103 · impl futura ANX-104  
**Pré-requisito:** [R03-domain-sketch.md](./R03-domain-sketch.md)  
**Callers:** [R05-storage-pg.md](./R05-storage-pg.md) · [ROUNDS.md](./ROUNDS.md). Sem schema de produção neste artefato. API esboço `/v1/billing` apenas.

## Convenções

| Aspecto | Decisão |
| --- | --- |
| schemaVersion | 0.1.0 |
| ownerDomain | `billing` |
| eventType | `billing.<aggregate>.<action>.v1` |
| Idempotência | `Idempotency-Key` → `commandId` |
| Segredos | **proibido** em DTO/evento (token PSP, PAN) |

### Códigos (`details.code`)

| Código | HTTP | Quando |
| --- | --- | --- |
| BIL_INVOICE_NOT_FOUND | 404 | Fora do scope |
| BIL_DUPLICATE_IDEMPOTENCY | 409 | Conflito de comando |
| BIL_CROSS_TENANT | 403 | Org mismatch |
| BIL_GRANT_INVALID | 403 | T01 DENY |
| BIL_REFUND_NOT_PAID | 409 | Refund sem paid |
| BIL_WEBHOOK_REPLAY | 200 | Mesmo receipt |
| BIL_USAGE_UNKNOWN | 422 | usageRecordId inválido no envelope |
| BIL_REVISION_CONFLICT | 409 | expectedRevision |
| BIL_IDEMPOTENT_REPLAY | 200 | Replay |

## Layout `@anxionos/contracts/billing/`

`types.ts`, `commands.ts`, `queries.ts`, `events.ts`, `errors.ts`, `index.ts`.

**BIL-R04-01:** InvoiceLine **sem** série de usage — só ids + quantidade + unidade.

## Eventos v1 emitidos

| eventType | Payload (sem secrets) | Consumidores |
| --- | --- | --- |
| `billing.subscription.updated.v1` | subscriptionId, organizationId, planId, status | graph, audit |
| `billing.invoice.issued.v1` | invoiceId, period, totalsHash | accounting, audit, operations |
| `billing.invoice.paid.v1` | invoiceId, paidAt, provider, externalIdHash | accounting, **partners**, graph, audit |
| `billing.refund.processed.v1` | refundId, invoiceId, amountHash | accounting, **partners**, audit |

**Consumers:** `connections.usage.recorded.v1` (UsageAggregator); `organizations.subscription.changed.v1` (sync plano/status).  
**BIL-R04-02:** não emite `accounting.journal.*` nem `partners.commission.*`.

## REST `/v1/billing/*`

| Método | Path | Grant |
| --- | --- | --- |
| GET | `/v1/billing/subscriptions` | billing.read |
| GET | `/v1/billing/invoices/:id` | billing.read |
| POST | `/v1/billing/invoices/:id/issue` | billing.admin + T01 |
| POST | `/v1/billing/refunds` | billing.refund + T01 |
| POST | `/v1/billing/webhooks/:provider` | billing.webhook (HMAC infra) |

## Oráculos

| ID | Esperado |
| --- | --- |
| G3-BIL-01 | Replay usageRecordId não cria segunda linha |
| G3-BIL-02 | Issue período fecha draft → issued + outbox |
| G3-BIL-03 | Refund sem paid → 409 BIL_REFUND_NOT_PAID |
| G3-BIL-04 | Webhook replay → 200 sem segundo paid |
| G5-BIL-01 | GET invoice outra org → 403 |
| G5-BIL-02 | organizationId no body ignorado |
| G5-BIL-03 | Webhook HMAC inválido → 401 (infra) |

## Alternativas rejeitadas

Ledger em billing; SQLite de cobrança; chamada síncrona connections; pasta marketplace; D-GOV-010 aqui.

## Saída R4

Contratos v1 aprovados para R5.
