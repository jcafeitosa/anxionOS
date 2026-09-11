---
type: debate
---
# R05 — Armazenamento: `modules/billing`

**Rodada:** R5  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-103  
**Callers:** [R04-contracts-events.md](./R04-contracts-events.md) · [R06-dependencies.md](./R06-dependencies.md) · [ROUNDS.md](./ROUNDS.md).  
**Engines ADR0004:** PostgreSQL autoritativo; Neo4j só projector; **sem** Timescale neste módulo; **sem** pgvector; SQLite **não** autoritativo.  
**Fonte:** `brain/notes/anxionos-storage-ownership.md` (**draft**; ST08 **0/23**). Tabelas alvo G1 — **nenhuma migration** neste pack.

## Princípios

| Princípio | Decisão |
| --- | --- |
| Verdade transacional | PostgreSQL `billing_*` |
| Grafo | `graph:billing:v1` — ids, **não** montantes como verdade |
| Journal/outbox | mesma transação |
| Idempotência | `billing_command_journal` + unique usage/webhook |
| FK cross-module | **Não** |
| Segredos em eventos | **Proibido** |
| SQLite | **Não** — BIL-R02-INV-03 |

```mermaid
sequenceDiagram
  participant CX as connections
  participant BIL as billing
  participant PG as PostgreSQL
  participant PSP as webhook
  participant ACC as accounting
  participant PAR as partners
  participant GRP as graph
  CX->>BIL: usage.recorded.v1
  BIL->>PG: aggregation + journal COMMIT
  BIL->>BIL: IssueInvoice período
  BIL->>PG: invoice issued + outbox
  PSP->>BIL: webhook
  BIL->>PG: receipt + paid + outbox COMMIT
  BIL->>ACC: invoice.paid.v1
  BIL->>PAR: invoice.paid.v1
  BIL->>GRP: graph:billing:v1
```

## Tabelas PostgreSQL (alvo G1)

| Tabela | Propósito |
| --- | --- |
| `billing_plans` | catálogo; revision |
| `billing_subscriptions` | (organization_id, subscription_id) |
| `billing_usage_aggregations` | UNIQUE (organization_id, usage_record_id) |
| `billing_invoices` | idempotency_key único por org |
| `billing_invoice_lines` | UNIQUE (invoice_id, usage_record_id) |
| `billing_refunds` | idempotency_key; paid_invoice_id lógico |
| `billing_webhook_receipts` | UNIQUE (provider, external_id) |
| `billing_command_journal` | command_id PK |

**BIL-R05-01:** PG autoritativo. **BIL-R05-02:** mutação + outbox mesma transação. **BIL-R05-03:** dedupe usage. **BIL-R05-04:** refund só paid. **BIL-R05-05:** RLS defer P09 (application-only S1–S2).

## Neo4j

| Evento | Projeção |
| --- | --- |
| subscription.updated | nó Subscription / HAS_PLAN |
| invoice.issued | HAS_INVOICE (ids, period — **sem** valor como ledger) |
| invoice.paid | status paid |

## Alternativas rejeitadas

Cobrança só SQLite; invoice só Neo4j; FK para connections.usage; Timescale de usage neste módulo.

## Saída R5

Modelo v1 para R6. **Nenhuma migration.** ST08 0/23.
