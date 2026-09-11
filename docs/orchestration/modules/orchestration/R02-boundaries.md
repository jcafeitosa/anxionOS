---
type: debate
---
# R02 — Fronteiras: `modules/orchestration`

**Issue:** ANX-393. Paperclip/checkout: [structure R02](../../structure-debate/orchestration/R02-paperclip-checkout-heartbeat.md).

## POSSUI

Goal, Task (produto), Run, TaskLease, RunHeartbeat, GateBinding, PlanRevision, TaskboardMirrorPort (espelho ANX-*, não ownership do board).

## NÃO POSSUI

| Item | Dono |
| --- | --- |
| Agent/AgentVersion | agents |
| Grant/epoch | governance |
| Neo4j traverse | graph |
| inference.invoke | connections |
| Claim Dashi como fonte de verdade de código | board local; orchestration espelha |

## Non-goals

Não pasta `projects/` ou `tasks/` física. PC 11/12 mapeiam para este módulo. `in_review` no board ≠ gate PASS.
