---
type: debate
---
# R07 — Riscos: `modules/audit`

**Rodada:** R7 · 2026-09-11 · ANX-389 · ANX-107  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md) · [ROUNDS.md](./ROUNDS.md).

## Registro

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-AUD-01 | Cross-tenant export/manifesto | 3 | 5 | 15 | org scope + T01 | G5 |
| R-AUD-02 | Duplicate tap | 3 | 4 | 12 | UNIQUE eventId | G3 |
| R-AUD-03 | Replay muta produção | 2 | 5 | 10 | read-only session | G4 G5 |
| R-AUD-04 | Secrets no chunk | 3 | 5 | 15 | redact + CI scan | G4 |
| R-AUD-05 | Volume recorder | 3 | 4 | 12 | object store + hash chain | G3 |
| R-AUD-06 | SQLite como trail | 2 | 5 | 10 | Non-goal R02; PG+object | G2 |
| R-AUD-07 | Pasta policies/ | 2 | 4 | 8 | PC 25 = governance+risk | P1 |
| R-AUD-08 | D-GOV-010 neste módulo | 1 | 3 | 3 | **Não** — risk P06 | P06 |
| R-AUD-09 | Segundo ledger no audit | 2 | 5 | 10 | só manifesto; não saldo | G2 |
| R-AUD-10 | Chunk UPDATE/DELETE | 3 | 5 | 15 | WORM; AUD-R05-03 | G3 G4 |

### Top 5

1. R-AUD-04 secrets · 2. R-AUD-01 cross-tenant · 3. R-AUD-03 replay mutate · 4. R-AUD-02 duplicate tap · 5. R-AUD-10 chunk mutate

## Oráculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-AUD-01 | G3 | replay: zero UPDATE capital/execution/accounting |
| G3-AUD-02 | G3 | tap dedupe por eventId |
| G3-AUD-S2-01 | G3 | mesmo evento não duplica `audit_manifests` |
| G3-AUD-S3-01 | G3 | ReplaySession sem grant → 403 |
| G5-AUD-01 | G5 | GET outra org 403 |
| G5-AUD-02 | G5 | chunk mutate reject |
| G5-AUD-03 | G5 | replay sem grant 403 `AUD_REPLAY_FORBIDDEN` |

## Non-goals

D-GOV-010; spec accepted; ANX-342 done; G1 ANX-108.

## Saída R7

Riscos v1 para R8.
