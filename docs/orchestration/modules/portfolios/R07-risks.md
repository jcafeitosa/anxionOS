---
type: debate
---

# R07 — Riscos: `modules/portfolios`

**Issue:** ANX-95

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-PF-01 | Cross-tenant leak em positions | 15 | org scope + test G5 |
| R-PF-02 | Double apply mesmo fill | 20 | idempotency_key + unique constraint |
| R-PF-03 | Position drift vs execution fills | 18 | PositionReconciliationCase + projector tests |
| R-PF-04 | Position cash drift vs accounting ledger | 16 | accounting consumer + reconcile case |
| R-PF-05 | SQLite position em dev | 18 | PF-R05-05 CI boundary |
| R-PF-06 | Stale ValuationSnapshot usado por risk | 14 | qualityFlags + CONFIRMED policy |
| R-PF-07 | REAL venue position bypass v1 | 10 | schema reject executionMode |
| R-PF-08 | Cross-portfolio double exposure (FI02 overlap) | 17 | shared capitalAccountId explicit in exposure API |
| R-PF-09 | RebalancePlan executa ordem direto | 16 | PF-R02-INV-11 + decisions gate |
| R-PF-10 | NAV calculado com price errado | 13 | observationId validation + PROVISIONAL flag |

Top 5 → R08. G5-PF-01 cross-tenant · G5-PF-02 double fill · G5-PF-03 position drift. Ownership: Position ≠ ledger ≠ reserva. D-GOV-010 = risk P06.

→ **R08** ([R08-decision-log.md](./R08-decision-log.md))
