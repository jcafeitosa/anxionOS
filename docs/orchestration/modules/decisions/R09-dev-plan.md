---
type: debate
status: draft
---

# R09 — Plano de implementação: `modules/decisions`

**Issue:** ANX-97 · impl: **ANX-98** · gate: ANX-58

## Slices P06

| Slice | Entrega | Gates |
| --- | --- | --- |
| **P06-S1** | schema decision+proposal+intent, contracts skeleton, ensureSchema | G2, G4 |
| **P06-S2** | propose + checkAuthority + submitIntent (state machine) + intent.submitted.v1 | G3, G5 |
| **P06-S3** | Disposition + approval flow + WAITING_HUMAN hook | G3 |
| **P06-S4** | risk consumer + capital reserve integration | G3 |
| **P06-S5** | EvidenceManifest + knowledge consumer | G6 parcial |
| **P06-S6** | graph:decisions:v1 projeção | defer |

## Matriz G3

| ID | Cenário | Slice |
| --- | --- | --- |
| G3-DC-S2-01 | propose creates Decision | S2 |
| G3-DC-S2-02 | submit immutability | S2 |
| G3-DC-S2-03 | cross-tenant reject | S2 |
| G3-DC-S2-04 | stale epoch reject | S2 |
| G3-DC-S2-05 | independent approver | S3 |
| G3-DC-S2-06 | premature submit (sem risk) → DC_SUBMIT_PRECONDITION | S2 |
| G3-DC-S2-07 | submit sem capital reservation → reject | S4 |
| G3-DC-S5-01 | consumer ignora intent se não SUBMITTED | S2 |

**Evidência impl:** `backend/tests/decisions/` (ANX-98 `in_review`)

**ANX-98** — impl `in_review`; debate G7 pendente **ANX-97**

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
