---
type: debate
status: draft
---

# R08 — Decision log: `modules/accounting`

**Issue:** ANX-93 · gate: ANX-58

| ID | Decisão | Status |
| --- | --- | --- |
| D-ACC-001 | accounting dono JournalEntry, LedgerPosting, FeePosting, ReconciliationCase financeiro | ✅ |
| D-ACC-002 | Partida dobrada obrigatória; posted imutável — Reversal para correção | ✅ |
| D-ACC-003 | Ledger PG autoritativo; **zero SQLite** para journal | ✅ |
| D-ACC-004 | capital BalanceView derivada de `accounting.ledger.posted.v1` | ✅ |
| D-ACC-005 | billing dono Invoice; accounting só projector pós `invoice.paid` | ✅ |
| D-ACC-006 | market-data dono preço; accounting só `priceRef` em linha | ✅ |
| D-ACC-007 | Fill→posting assíncrono projector + idempotência | ✅ |
| D-ACC-008 | Fee venue vs platform fee — agregados distintos | ✅ |
| D-ACC-009 | SIMULATED+PAPER only v1; REAL reject | ✅ |
| D-ACC-010 | graph:accounting:v1 async projeção linhagem | ✅ |
| D-ACC-011 | connections usage → billing → accounting (não direto) | ✅ |
| D-ACC-012 | ReconciliationCase ownerDomain=accounting; subtarefas por contrato | ✅ |
| D-ACC-015 | RLS defer P09 — application-only tenancy | ✅ |

→ **R09** ([R09-dev-plan.md](./R09-dev-plan.md))
