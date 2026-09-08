---
type: debate
---

# R07 — Riscos: `modules/accounting`

**Issue:** ANX-93

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-ACC-01 | Cross-tenant leak em journal | 15 | org scope + test G5 |
| R-ACC-02 | Double posting mesmo fill | 20 | idempotency_key + unique constraint |
| R-ACC-03 | Ledger drift vs capital BalanceView | 14 | reconciliation case + snapshot |
| R-ACC-04 | SQLite ledger em dev | 18 | ACC-R05-05 CI boundary |
| R-ACC-05 | Billing invoice duplicada → double revenue | 16 | billing event idempotency + ACC-R03-INV-04 |
| R-ACC-06 | Price ref stale/wrong observation | 12 | MarketDataPort asOf validation |
| R-ACC-07 | REAL venue posting bypass v1 | 10 | schema reject executionMode |
| R-ACC-08 | Unbalanced entry por bug projector | 19 | DB check constraint + pre-commit validator |

Top 5 → R08. G5-ACC-01 cross-tenant · G5-ACC-02 double posting · G5-ACC-03 unbalanced reject

→ **R08** ([R08-decision-log.md](./R08-decision-log.md))
