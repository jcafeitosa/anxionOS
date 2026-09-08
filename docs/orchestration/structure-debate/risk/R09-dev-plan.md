---
type: debate
status: draft
---

# R09 — Plano de implementação: `modules/risk`

**Issue:** ANX-99 · impl: **ANX-100** · gate: ANX-58

## Slices P06

| Slice | Entrega | Gates |
| --- | --- | --- |
| **P06-S1** | schema policy+check+permit, contracts skeleton, ensureSchema | G2, G4 |
| **P06-S2** | runPreTradeCheck + check.completed.v1 + permit issued | G3, G5 |
| **P06-S3** | Kill switch + epoch bump + consumer wiring | G3 |
| **P06-S4** | Post-trade check defer | G6 parcial |
| **P06-S5** | graph:risk:v1 projeção | defer |

## Matriz G3

G3-RK-S2-01 check PASS emits permit · G3-RK-S2-02 CONFIG_REQUIRED deny · G3-RK-S2-03 cross-tenant reject · G3-RK-S2-04 stale epoch reject · G3-RK-S2-05 limit exceeded deny

**ANX-100** — blocked_by ANX-99 G7

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
