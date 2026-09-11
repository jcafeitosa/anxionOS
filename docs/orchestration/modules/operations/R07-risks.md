---
type: debate
---
# R07 — Riscos: `modules/operations`

**Rodada:** R7 · 2026-09-11 · ANX-389 · ANX-111  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

| ID | Risco | Sev | Mitigação | Gate |
| --- | ---: | --- | --- |
| R-OPS-01 | Cross-tenant export/incident | 15 | AgencyScope | G4 G5 |
| R-OPS-02 | Export bypass retention | 20 | OPS_RETENTION_DENIED | G3 G4 |
| R-OPS-03 | PII no grafo | 15 | só ids | G4 |
| R-OPS-04 | Replay audit no módulo | 10 | só deltaRefId | G2 |
| R-OPS-05 | SQLite incidente | 10 | INV-03 | G2 |
| R-OPS-06 | Kill switch aqui | 10 | risk | G2 |
| R-OPS-07 | Pasta infrastructure/ 24º | 8 | PC 18 | P1 |
| R-OPS-08 | D-GOV-010 | 3 | risk P06 | P06 |

Top: R-OPS-02 · R-OPS-01 · R-OPS-03.

## Oráculos G5

G5-OPS-01 GET export outra org 403 · G5-OPS-02 export sem grant 403 · G5-OPS-03 retention deny.

## Saída R7

Fechado para R8.
