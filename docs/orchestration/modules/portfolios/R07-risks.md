---
type: debate
---
# R07 — Riscos: `modules/portfolios`

**Rodada:** R7  
**Data:** 2026-09-11  
**Issues:** ANX-389 · ANX-95  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

## Registro

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-PF-01 | Cross-tenant leak em positions | 3 | 5 | 15 | org scope + G5-PF-01 | G4 G5 |
| R-PF-02 | Double apply mesmo fill | 4 | 5 | 20 | idempotency_key + unique | G3 |
| R-PF-03 | Position drift vs execution fills | 4 | 5 | 20 | PositionReconciliationCase | G3 G5 |
| R-PF-04 | Position cash drift vs accounting ledger | 3 | 5 | 15 | accounting consumer | G3 |
| R-PF-05 | SQLite position em dev | 3 | 5 | 15 | PF-R05-05 CI | G2 G4 |
| R-PF-06 | Stale ValuationSnapshot usado por risk | 3 | 4 | 12 | CONFIRMED + qualityFlags | G3 |
| R-PF-07 | REAL venue position bypass v1 | 2 | 5 | 10 | schema reject executionMode | G3 |
| R-PF-08 | Cross-portfolio double exposure (FI02) | 3 | 5 | 15 | capitalAccountId explícito | G3 |
| R-PF-09 | RebalancePlan executa ordem direto | 3 | 5 | 15 | PF-R02-INV-11 + decisions | G2 |
| R-PF-10 | NAV com price errado | 3 | 4 | 12 | observationId + PROVISIONAL | G3 |
| R-PF-11 | D-GOV-010 neste módulo | 1 | 3 | 3 | risk P06 | P06 |

### Top 5

R-PF-02 · R-PF-03 · R-PF-01 · R-PF-05 · R-PF-09

Ownership: Position ≠ ledger ≠ reserva. D-GOV-010 = risk P06.

## Oráculos G5

| ID | Esperado |
| --- | --- |
| G5-PF-01 | GET positions outra org → 403 |
| G5-PF-02 | double fill → mesma revision |
| G5-PF-03 | position drift vs fills → ReconciliationCase OPEN |

## Saída R7

Riscos fechados para R8. Sem pasta `approvals/` / `policies/`.
