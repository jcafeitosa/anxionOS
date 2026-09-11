---
type: debate
---
# R05 — Armazenamento: `modules/accounting`

**Rodada:** R5  
**Data:** 2026-09-11  
**Issue:** ANX-93 · pack ANX-389  
**Callers:** [R04-contracts-events.md](./R04-contracts-events.md) · [R06-dependencies.md](./R06-dependencies.md). ADR0004. **Sem migration.** ST08 **0/23**.

## In / Out (R5)

**In:** PG journal/postings/fees/reconciliation + outbox; snapshots rebuildáveis.

**Out:** modelo documental. **Não** Timescale ledger. **Não** Neo4j writer. Sem SQLite.

## Non-goals

Não RLS P09. Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`.

## Ownership (storage)

| Superfície | Dono |
| --- | --- |
| chart/journal/postings/fees/recon/snapshots | **accounting** |
| ticks | **market-data** (Timescale) |
| graph:accounting:v1 | **graph** projector |
| adapter-gateway | **KEEP** |

## Decisão R05 (núcleo)

**PostgreSQL é o único journal autoritativo do ledger.** Nenhum SQLite, arquivo local ou cache substitui confirmação de JournalEntry. Neo4j projeta linhagem de lançamentos; Timescale **não** armazena ledger (só market-data).

## Matriz de ownership

| Dado | Engine | Notas |
| --- | --- | --- |
| `chart_of_accounts`, `journal_entries`, `ledger_postings` | **PostgreSQL** | estado autoritativo — partida dobrada |
| `fee_schedules`, `fee_postings`, `reconciliation_cases` | **PostgreSQL** | financeiro institucional |
| `command_journal`, `outbox` | **PostgreSQL** | atômico com mutação (packages/eventing) |
| `ledger_balance_snapshots` | **PostgreSQL** | read model asOf (derivado, rebuildável) |
| Projeção lançamento→titular→conta→portfolio | **Neo4j** | via `graph:accounting:v1` async |
| Séries de preço | **TimescaleDB** | **market-data** — accounting só FK/ref |
| SQLite | — | **proibido** journal/ledger/postings |

## Schema sketch (Drizzle v1)

```
accounting_chart_accounts (org_id, code, kind, currency, status, ...)
accounting_journal_entries (id, org_id, entry_kind, status, source_ref, value_date, idempotency_key, ...)
accounting_ledger_postings (id, entry_id, account_code, debit, credit, asset, amount, price_ref_json, ...)
accounting_fee_postings (id, entry_id, fill_id, fee_kind, amount, ...)
accounting_reconciliation_cases (id, org_id, case_kind, status, owner_domain, ...)
accounting_ledger_balance_lines (org_id, account_code, asset, balance, as_of, revision)
```

## Invariantes storage (`ACC-R05-*`)

| ID | Regra |
| --- | --- |
| ACC-R05-01 | **Nenhum** journal/ledger autoritativo fora PostgreSQL |
| ACC-R05-02 | JournalEntry POSTED + postings inseridos na mesma transação |
| ACC-R05-03 | `idempotency_key` único por `(org_id, idempotency_key)` |
| ACC-R05-04 | Posted entry append-only — sem UPDATE em amount de linha |
| ACC-R05-05 | SQLite, WAL local, JSON file ledger → **rejeitado** em CI boundary test |
| ACC-R05-06 | RLS defer P09 — application-only tenancy (D-ACC-015) |

## Anti-padrões rejeitados

| Opção | Veredito | Racional |
| --- | --- | --- |
| SQLite ledger local para dev | ❌ Rejeitado | Viola ACC-R05-01; usar PG testcontainer/fixture |
| Duplicar saldo em Redis como fonte | ❌ Rejeitado | Cache invalidável; PG é truth |
| Ledger em Neo4j | ❌ Rejeitado | Grafo é projeção; ADR0001/0004 |

→ **R06** ([R06-dependencies.md](./R06-dependencies.md))
