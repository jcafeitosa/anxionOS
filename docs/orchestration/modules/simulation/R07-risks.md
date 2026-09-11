---
type: debate
---
# R07 — Riscos: `modules/simulation`

**Rodada:** R7 · ANX-389 · ANX-115  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

| ID | Risco | Sev | Mitigação |
| --- | ---: | --- |
| R-SIM-01 | Escape sandbox / REAL egress | 20 | deny-by-default |
| R-SIM-02 | SQLite como ledger | 15 | SIM-R05-03 |
| R-SIM-03 | Cross-tenant run | 15 | AgencyScope + path |
| R-SIM-04 | Completed sem TIER_SIMULATED | 12 | INV-06 |
| R-SIM-05 | Dataset hash mismatch ignorado | 12 | FAILED |
| R-SIM-06 | Pasta experiments/ | 8 | PC 21 |
| R-SIM-07 | D-GOV-010 | 3 | risk P06 |

Oráculos G5: G5-SIM-01 403 · G5-SIM-02 REAL egress · G5-SIM-03 hash mismatch FAILED.

## Saída R7

Fechado para R8.
