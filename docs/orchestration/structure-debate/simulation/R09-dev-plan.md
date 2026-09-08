---
type: debate
status: draft
---

# R09 — Plano: `modules/simulation`

**ANX-115** · impl **ANX-116**

| Slice | Entrega | Gates |
| --- | --- | --- |
| S1 | schema + contracts + sandbox config | G2, G4 |
| S2 | consumer `strategies.backtest.requested.v1` → run lifecycle | G3 |
| S3 | emit `simulation.run.completed.v1` + determinism checkpoint | G3 |
| S4 | HTTP v1 + graph stub | G6 parcial |

## Matriz G3/G5

| ID | Cenário |
| --- | --- |
| G3-SIM-S2-01 | requested → started → completed |
| G3-SIM-S2-02 | duplicate request idempotent |
| G5-SIM-01 | sandbox path traversal blocked |
| G5-SIM-02 | dataset hash tamper → FAILED |
| G5-SIM-03 | cross-tenant run isolation |
| G5-SIM-04 | replay determinism same seed |

**Evidência impl:** `backend/tests/simulation/` (ANX-116 `in_review`)

**ANX-116** — impl `in_review`; debate G7 pendente **ANX-115**

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
