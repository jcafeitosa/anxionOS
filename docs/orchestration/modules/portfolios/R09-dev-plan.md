---
status: draft
type: debate
---
# R09 — Plano de implementação: `modules/portfolios`

**Rodada:** R9  
**Data:** 2026-09-11  
**Issue:** ANX-95 · impl: **ANX-96** · gate: ANX-58 · pack ANX-389  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md). Plano **draft**.

## In / Out (R9)

**In:** slices P06-S1–S6; matriz G3-PF-*; fixtures fill/capital/instrument.

**Out:** ordem de slices. **Não** ST08. **Não** ANX-389 `done`. Exposure Timescale S6 defer.

## Non-goals

Não spec `accepted`. Não ST08 live. Não ANX-342/389 `done`. Não G7 ANX-96 neste pack.

## Ownership (plano)

| Superfície | Dono |
| --- | --- |
| schema + fill projector | **portfolios** (ANX-96) |
| fill fixture | **execution** |
| CapitalAccount fixture | **capital** |
| adapter-gateway | **KEEP** |

## Slices P06

| Slice | Entrega | Gates |
| --- | --- | --- |
| **P06-S1** | schema portfolio+position+holding, contracts skeleton, ensureSchema | G2, G4 |
| **P06-S2** | fill projector + `portfolios.position.updated.v1` + idempotency | G3, G5 |
| **P06-S3** | ValuationSnapshot confirm + `portfolios.valuation.confirmed.v1` | G3 |
| **P06-S4** | accounting cash reconcile consumer + PositionReconciliationCase | G3 |
| **P06-S5** | RebalancePlan propose/approve + graph:portfolios:v1 stub | G6 parcial |
| **P06-S6** | exposure snapshot + Timescale nav series (opcional) | defer |

## Matriz G3

| ID | Cenário | Slice |
| --- | --- | --- |
| G3-PF-S2-01 | fill apply updates quantity | S2 |
| G3-PF-S2-02 | duplicate idempotency → same revision | S2 |
| G3-PF-S2-03 | cross-tenant reject | S2 |
| G3-PF-S2-04 | REAL mode reject | S2 |
| G3-PF-S2-05 | position key uniqueness | S2 |
| G3-PF-S4-01 | ledger lag → reconciliation case OPEN | S4 |
| G3-PF-S4-02 | fill before ledger — cash position provisional | S4 |
| G3-PF-S4-03 | duplicate ledger entry → no double cash | S4 |

## Fixtures v1

- `execution.fill.confirmed.v1` SIMULATED fixture até execution G1
- Portfolio seed ligado a CapitalAccount fixture (ANX-92)
- Instrument fixture market-data (ANX-88)
- Ledger lag fixture: posted event atrasado 1 checkpoint

**Evidência impl:** `backend/tests/portfolios/` (ANX-96 `in_review`)

**ANX-96** — impl `in_review`; debate G7 pendente **ANX-95**. Pack ANX-389 **não** `done`.

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
