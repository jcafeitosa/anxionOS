---
type: debate
---

# R07 — Riscos: `modules/capital`

**Issue:** ANX-91

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-CAP-01 | Cross-tenant leak | 15 | org scope |
| R-CAP-02 | Double allocation FI02 | 20 | serializable tx |
| R-CAP-03 | Reserva sem grant | 18 | GovernancePort |
| R-CAP-04 | Ledger drift | 12 | accounting consumer |
| R-CAP-05 | Grant revogado mid-flight | 14 | block new holds |
| R-CAP-06 | REAL bypass v1 | 10 | schema reject |

Top 5 → R08. G5-CAP-01 cross-tenant · G5-CAP-02 FI02 · G5-CAP-03 REAL reject

→ **R08** ([R08-decision-log.md](./R08-decision-log.md))
