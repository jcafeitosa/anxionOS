---
type: debate
---
# R07 — Riscos: `modules/evaluation`

**Rodada:** R7 · 2026-09-11 · ANX-389 · ANX-109  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md).

## In / Out (R7)

**In:** ameaças de promoção indevida, leak de score, cert sem evidência.

**Out:** venue (`execution`). Saldo (`capital`). PolicyVersion RISK (`risk`). Twin (`simulation`). D-GOV-010.

## Ownership

| Superfície | Dono |
| --- | --- |
| Registro de riscos de avaliação | **evaluation** |
| adapter-gateway | **KEEP** |

## In scope (ameaças deste bounded context)

Promoção indevida, leak cross-tenant de score, certificação sem evidência de run, recommendation que muta grants, 24º módulo `testing/`, confundir D-GOV-010 com evaluation.

## Out of scope

Ameaça de venue/ordem (`execution`); saldo (`capital`); PolicyVersion RISK (`risk` P06); Twin crash (`simulation`).

## Non-goals

Não “mitigar” com stub de certificação. Não aceitar SIMULATED como CERTIFIED.

## Registro

| ID | Risco | Sev | Mitigação |
| --- | --- | ---: | --- |
| R-EVL-01 | Auto-promote bypass cert | 20 | INV: só `certification.issued`; strategies recusa score-only |
| R-EVL-02 | Cross-tenant score/cert | 15 | AgencyScope em todo comando; oráculo G5-EVL-01 |
| R-EVL-03 | Cert sem run/subject válido | 15 | EVL_SUBJECT_INVALID 409; G3-EVL-02 |
| R-EVL-04 | Recommendation aplica grant | 10 | só evento; apply fica em governance |
| R-EVL-05 | Pasta `testing/` como 24º | 8 | PC 15; fixtures em `backend/tests/` |
| R-EVL-06 | D-GOV-010 no pack evaluation | 3 | defer **risk P06** |
| R-EVL-07 | Projector escreve métrica crua | 8 | R05: só CERTIFIES + lineage |
| R-EVL-08 | SQLite como cert “offline” | 12 | ST04; fail-closed |

## Oráculos G3 / G5

| ID | Gate | Ataque / caso | Resultado |
| --- | --- | --- | --- |
| G3-EVL-01 | G3 | Replay commandId | 1 record |
| G3-EVL-02 | G3 | Cert sem completed run | 409 EVL_SUBJECT_INVALID |
| G3-EVL-06 | G3 | Promote via score.computed | strategies **não** CERTIFIED |
| G5-EVL-01 | G5 | Agency B lê record de A | 403; 0 rows |
| G5-EVL-02 | G5 | T01 DENY no POST cert | 403 EVL_GRANT_INVALID |
| G5-EVL-03 | G5 | Cert subject inexistente | 409 |
| G5-EVL-05 | G5 | Forjar recommendation → apply grant | governance recusa sem mandato próprio |

## Saída R7

Fechado para R8.
