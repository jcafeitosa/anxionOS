---
type: debate
---
# R07 — Riscos: `modules/audit`

**Issue:** ANX-107 · pack ANX-389  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-AUD-01 | Cross-tenant export | 3 | 5 | 15 | org scope + T01 | G5 |
| R-AUD-02 | Duplicate tap | 3 | 4 | 12 | unique eventId | G3 |
| R-AUD-03 | Replay muta produção | 2 | 5 | 10 | read-only session | G4 G5 |
| R-AUD-04 | Secrets no chunk | 3 | 5 | 15 | redact + CI scan | G4 |
| R-AUD-05 | Volume recorder | 3 | 4 | 12 | object store + hash chain | G3 |
| R-AUD-06 | SQLite como trail | 2 | 5 | 10 | Non-goal R02 | G2 |
| R-AUD-07 | Pasta policies/ | 2 | 4 | 8 | PC 25 = governance+risk | P1 |
| R-AUD-08 | D-GOV-010 aqui | 1 | 3 | 3 | risk P06 | P06 |

### Top 5

R-AUD-04 · R-AUD-01 · R-AUD-03 · R-AUD-02 · R-AUD-05

## Oráculos G5

G5-AUD-01 cross-tenant 403 · G5-AUD-02 chunk mutate reject · G5-AUD-03 replay sem grant 403 AUD_REPLAY_FORBIDDEN

## Saída R7

Para R8.
