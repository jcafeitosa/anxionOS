---
type: debate
---

# R07 — Riscos: `modules/strategies`

**Issue:** ANX-89

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-ST-01 | Cross-tenant strategy/signal leak | 15 | org scope queries |
| R-ST-02 | Stale signal → wrong decision | 20 | expiresAt + decisions reject |
| R-ST-03 | Auto-promote by backtest return | 15 | ST-R02-INV-06 |
| R-ST-04 | Binding swap mid-deployment | 12 | immutable snapshot |
| R-ST-05 | REAL mode bypass v1 | 10 | schema reject REAL |

Top 5 → R08. G5-ST-01 cross-tenant signal · G5-ST-02 REAL reject · G5-ST-03 stale signal

→ **R08** ([R08-decision-log.md](./R08-decision-log.md))
