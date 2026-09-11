---
type: debate
---
# R07 — Riscos: `modules/billing`

**Rodada:** R7  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-103  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md) · [ROUNDS.md](./ROUNDS.md).

## Registro

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-BIL-01 | Cross-tenant invoice leak | 3 | 5 | 15 | AgencyScopePort | G4 G5 |
| R-BIL-02 | Webhook replay double-pay | 4 | 5 | 20 | UNIQUE (provider, external_id) | G3 G5 |
| R-BIL-03 | Double invoice do mesmo usage | 4 | 5 | 20 | UNIQUE usage_record_id | G3 |
| R-BIL-04 | Refund sem paid / double refund | 3 | 5 | 15 | BIL-R03-03 + unique key | G3 |
| R-BIL-05 | Secrets PSP em evento/grafo | 3 | 5 | 15 | só hashes; secret store | G4 |
| R-BIL-06 | billing escreve ledger | 2 | 5 | 10 | Non-goal; só eventos | G2 |
| R-BIL-07 | SQLite cobrança “dev” | 2 | 5 | 10 | BIL-R02-INV-03 | G2 G4 |
| R-BIL-08 | Outbox sem journal | 2 | 5 | 10 | UoW única | G3 |
| R-BIL-09 | T01 bypass issue/refund | 2 | 5 | 10 | fail-closed | G4 G5 |
| R-BIL-10 | Comissão no mesmo módulo | 2 | 4 | 8 | partners dono | P1 |
| R-BIL-11 | Pasta marketplace 24º | 2 | 4 | 8 | PC 29 composto | P1 |
| R-BIL-12 | D-GOV-010 neste módulo | 1 | 3 | 3 | **Não** — risk P06 | P06 |

### Top 5

1. R-BIL-02 webhook replay · 2. R-BIL-03 double invoice · 3. R-BIL-01 cross-tenant · 4. R-BIL-05 secrets · 5. R-BIL-04 refund

## Oráculos G5

| ID | Cenário | Esperado |
| --- | --- | --- |
| G5-BIL-01 | GET invoice outra org | 403 |
| G5-BIL-02 | webhook replay | 200; um único paid |
| G5-BIL-03 | usage replay | uma InvoiceLine |
| G5-BIL-04 | Issue T01 DENY | 403 |
| G5-BIL-05 | refund unpaid | 409 BIL_REFUND_NOT_PAID |

## Saída R7

Riscos v1 fechados para R8.
