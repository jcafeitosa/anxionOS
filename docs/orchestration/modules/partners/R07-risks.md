---
type: debate
---
# R07 — Riscos: `modules/partners`

**Rodada:** R7  
**Data:** 2026-09-11  
**Issues:** ANX-389 · ANX-113  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

## Registro

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-PTR-01 | Cross-tenant referral/payout | 3 | 5 | 15 | AgencyScopePort | G4 G5 |
| R-PTR-02 | Double commission no mesmo invoice | 4 | 5 | 20 | UNIQUE invoice+referral | G3 |
| R-PTR-03 | Refund sem reverse | 3 | 5 | 15 | consumer refund | G3 |
| R-PTR-04 | Double reverse | 3 | 4 | 12 | UNIQUE refund_id | G3 |
| R-PTR-05 | Payout SETTLED duplicado | 3 | 5 | 15 | state machine + journal | G3 |
| R-PTR-06 | Ledger neste módulo | 2 | 5 | 10 | só eventos | G2 |
| R-PTR-07 | SQLite payout | 2 | 5 | 10 | PTR-R02-INV-03 | G2 |
| R-PTR-08 | Pasta marketplace | 2 | 4 | 8 | PC 29 | P1 |
| R-PTR-09 | T01 bypass | 2 | 5 | 10 | fail-closed | G4 G5 |
| R-PTR-10 | D-GOV-010 aqui | 1 | 3 | 3 | risk P06 | P06 |

### Top 5

R-PTR-02 · R-PTR-01 · R-PTR-05 · R-PTR-03 · R-PTR-09

## Oráculos G5

| ID | Esperado |
| --- | --- |
| G5-PTR-01 | GET outra org 403 |
| G5-PTR-02 | paid replay um accrual |
| G5-PTR-03 | refund reverse único |
| G5-PTR-04 | T01 DENY 403 |
| G5-PTR-05 | accrue unpaid 409 |

## Saída R7

Riscos fechados para R8.
