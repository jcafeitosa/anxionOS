---
status: draft
type: debate
---
# R09 — Plano de implementação: `modules/risk`

**Issue:** ANX-99 · impl: **ANX-100** (blocked_by ANX-99 G7) · gate ANX-58 · pack ANX-389  
**Callers:** [R08-decision-log.md](./R08-decision-log.md) · [R10-g0-handoff.md](./R10-g0-handoff.md).

## In / Out (R9)

**In (G1 futuro):** schema policy+check+permit; runPreTradeCheck; kill switch + epoch; projector contract `graph:risk:v1`.

**Out deste pack:** migration agora; REAL; post-trade S4; ST08 live; ANX-342 done.

## Non-goals P1

Só G0 documental. Não executar ANX-100 aqui.

## Slices P06 (pós-Owner)

| Slice | Entrega | Gates |
| --- | --- | --- |
| P06-S1 | schema policy+check+permit, contracts, ensureSchema | G2, G4 |
| P06-S2 | runPreTradeCheck + check.completed + permit issued | G3, G5 |
| P06-S3 | Kill switch + epoch bump + consumers | G3 |
| P06-S4 | Post-trade check defer | G6 parcial |
| P06-S5 | graph:risk:v1 projeção | defer |

## Matriz oráculos

| ID | Caso |
| --- | --- |
| G3-RK-S2-01 | check PASS emite permit |
| G3-RK-S2-02 | CONFIG_REQUIRED deny |
| G3-RK-S2-03 | cross-tenant reject |
| G3-RK-S2-04 | stale epoch reject |
| G3-RK-S2-05 | limit exceeded deny |
| G5-RK-01 | RK_CROSS_TENANT |
| G5-RK-02 | RK_PERMIT_STALE |
| G5-RK-03 | RK_POLICY_STALE |

## Defer

REAL v1; post-trade S4; RLS P09; ST08; spec `accepted`.

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
