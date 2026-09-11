---
status: draft
type: debate
---
# R08 — Decision log: `modules/accounting`

**Rodada:** R8  
**Data:** 2026-09-11  
**Issues:** ANX-389 · ANX-93  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md). Status **draft** — não `accepted`.

## In / Out (R8)

**In:** D-ACC-001–015 + P1-ACC-* (PG, partida dobrada, projector fill, PAPER/SIMULATED, KEEP adapter-gateway).

**Out:** este log. **Não** promove spec. **Não** fecha ANX-93/389. Sem ST08 live.

## Non-goals

Não stamp `accepted`. Não fake ST08. Não ANX-342/389 `done`.

## Ownership (log)

| Superfície | Dono |
| --- | --- |
| JournalEntry / LedgerPosting / FeePosting / ReconciliationCase | **accounting** |
| Invoice | **billing** |
| BalanceView | **capital** (derivada) |
| preço | **market-data** |
| adapter-gateway | **KEEP** |

| ID | Decisão | Status |
| --- | --- | --- |
| D-ACC-001 | accounting dono JournalEntry, LedgerPosting, FeePosting, ReconciliationCase financeiro | draft |
| D-ACC-002 | Partida dobrada obrigatória; posted imutável — Reversal para correção | draft |
| D-ACC-003 | Ledger PG autoritativo; **zero SQLite** para journal | draft |
| D-ACC-004 | capital BalanceView derivada de `accounting.ledger.posted.v1` | draft |
| D-ACC-005 | billing dono Invoice; accounting só projector pós `invoice.paid` | draft |
| D-ACC-006 | market-data dono preço; accounting só `priceRef` em linha | draft |
| D-ACC-007 | Fill→posting assíncrono projector + idempotência | draft |
| D-ACC-008 | Fee venue vs platform fee — agregados distintos | draft |
| D-ACC-009 | SIMULATED+PAPER only v1; REAL reject | draft |
| D-ACC-010 | graph:accounting:v1 async projeção linhagem | draft |
| D-ACC-011 | connections usage → billing → accounting (não direto) | draft |
| D-ACC-012 | ReconciliationCase ownerDomain=accounting; subtarefas por contrato | draft |
| D-ACC-015 | RLS defer P09 — application-only tenancy | draft |
| P1-ACC-01 | Pack canônico docs/orchestration/modules/accounting/ | draft |
| P1-ACC-02 | Spec 001–005 **draft** — não accepted | draft |
| P1-ACC-03 | Não é G7 código nem ANX-342 | draft |
| P1-ACC-04 | Tabelas nomeadas R05; G3-ACC-S2-* / G5-ACC-* em R10 | draft |
| P1-ACC-05 | D-GOV-010 = risk P06; sem pasta approvals/policies | draft |

## Persistência nomeada (eco R05)

`accounting_chart_accounts`, `accounting_journal_entries`, `accounting_ledger_postings`, `accounting_fee_postings`, `accounting_reconciliation_cases`, `accounting_ledger_balance_lines`, `accounting_command_journal`.

## Saída R8

Aprovado para R9 documental. **Não** autoriza G1.
