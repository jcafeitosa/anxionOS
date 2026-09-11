---
type: debate
---
# R05 — Armazenamento: `modules/execution`

**Rodada:** R5  
**Data:** 2026-09-11  
**Issue:** ANX-101 · pack ANX-389  
**Callers:** [R04-contracts-events.md](./R04-contracts-events.md) · [R06-dependencies.md](./R06-dependencies.md). ADR0004 PG. **Sem migration.** ST08 **0/23**.

## In / Out (R5)

**In:** tabelas `execution_*` + outbox mesma UoW; índices intentHash / UNIQUE client_order_id.

**Out:** modelo documental. **Não** colunas secret. **Não** Neo4j writer no módulo. Sem SQLite autoritativo.

## Non-goals

Não RLS P09. Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`.

## Ownership (storage)

| Superfície | Dono |
| --- | --- |
| execution_session/order/fill/adapter_ref/reconciliation | **execution** |
| Position node | **portfolios** (projector) |
| secret store | **connections** |
| adapter-gateway | **KEEP** |

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
