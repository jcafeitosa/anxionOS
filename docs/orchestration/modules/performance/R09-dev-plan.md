---
type: debate
status: draft
---

# R09 — Plano: `modules/performance`

**ANX-105** · impl **ANX-106**

| Slice | Entrega | Gates |
| --- | --- | --- |
| S1 | schema + contracts + OfficialMetricDefinition | G2, G4 |
| S2 | dual projector ledger + position | G3 |
| S3 | OutcomeSnapshot + HTTP v1 | G3 |
| S4 | Timescale metric series + rebuild | G3 |
| S5 | graph stub | G6 parcial |

## Matriz G3

G3-PERF-S2-01 ledger posted updates realized · G3-PERF-S2-02 position updated updates exposure · G3-PERF-S2-03 stale position reject · G3-PERF-S2-04 cross-tenant · G3-PERF-S4-01 rebuild idempotent

## Matriz G5

G5-PERF-01 replay duplicate ledger · G5-PERF-02 position/ledger divergence snapshot

**Evidência impl:** `backend/tests/performance/` (ANX-106 `in_review`)

**ANX-106** — impl `in_review`; debate G7 pendente **ANX-105**

→ **R10** ([R10-g0-handoff.md](./R10-g0-handoff.md))
