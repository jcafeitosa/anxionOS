---
type: debate
---

# R05 — Armazenamento: `modules/execution`

**Issue:** ANX-101

## PostgreSQL (autoritativo)

| Tabela / agregado | Notas |
| --- | --- |
| `execution_venue_adapter_ref` | Sem coluna secret; só connectionId + kind |
| `execution_session` | FK organizationId; índice intentHash |
| `execution_order` | UNIQUE (organization_id, client_order_id, venue_adapter_ref_id) |
| `execution_fill` | UNIQUE (organization_id, fill_id); UNIQUE parcial venue_fill_id |
| `execution_order_attempt` | append-only |
| `execution_reconciliation_case` | ownerDomain=execution |
| `execution_outbox` | journal atômico com mutações |

## Neo4j (projeção async)

Relações: `TradeIntent` → `ExecutionSession` → `Order` → `Fill` → `Position` (portfolios projector).

## Proibições

- SQLite para order/fill/session autoritativo (EX-R02-INV-10)
- Colunas `api_key`, `secret`, `token` em qualquer tabela execution
- `executionMode=REAL` em insert/update (trigger ou app guard)

## RLS / tenancy

Todas as queries filtram `organizationId`; cross-tenant FK rejeitada na aplicação v1 (RLS formal defer P09).

→ **R06** ([R06-dependencies.md](./R06-dependencies.md))
