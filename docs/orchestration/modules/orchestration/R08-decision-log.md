---
type: debate
status: draft
---
# R08 — Decision log: `modules/orchestration`

**Rodada:** R8  
**Data:** 2026-09-11  
**Issue:** ANX-393 · pack ANX-389  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md).

## In / Out (R8)

**In scope:** decisões de ownership Goal/Task/Run/TaskLease/GateBinding/PlanRevision; engines PG vs grafo; mirror Dashi; T01; KEEP adapter-gateway.

**Out of scope:** aceite spec 002; fechar ANX-342; stamp `accepted`; ST08 live; G7 de código; ANX-389 `done`.

## Non-goals

Não reabrir fronteiras R02 neste log. Não fake ST08 live. Não criar pasta `projects/`. Não G7 de implementação.

## Ownership consolidado

| Agregado / superfície | Dono |
| --- | --- |
| Goal, Task, Run, TaskLease, Heartbeat, GateBinding, PlanRevision | **orchestration** |
| Agent / Skill | **agents** |
| Grant / T01 | **governance** |
| Neo4j projector | **graph** |
| Evidence | **knowledge** |
| Dashi claim | board local (mirror only) |
| adapter-gateway | **KEEP** |

| ID | Decisão | Rodada | Status |
| --- | --- | --- | --- |
| D-ORC-001 | Dono Goal/Task/Run/lease/heartbeat/GateBinding — não grants/Agent/Neo4j | R1–R3 | fechada |
| D-ORC-005 | Checkout = TaskLease PG; idempotente (agentId, taskId) | R2 R5 | fechada |
| D-ORC-007 | goalAncestry denormalizado; Goal DAG aqui | R3 | fechada |
| D-ORC-015 | PlanRevision separado de Goal | R3 R5 | fechada |
| D-ORC-021 | Eventos v1 R04; leaseToken só hash | R4 | fechada |
| D-ORC-028 | TaskLease tabela filha 1:1 | R5 | fechada |
| D-ORC-031 | command_journal HTTP | R4 R5 | fechada |
| D-ORC-032 | Dashi = TaskboardMirrorPort, não ledger | R2 R6 | fechada |
| D-ORC-033 | T01 fail-closed pré-StartRun efeito externo | R6 R7 | fechada |
| D-ORC-034 | D-GOV-010 = **risk P06** | R7 | fechada |
| D-ORC-035 | RLS defer P09; ST08 0/23 | R5 | fechada |
| P1-ORC-01 | Pack canônico em modules/orchestration | P1 | fechada |
| P1-ORC-02 | Sem pastas projects/tasks/agent-teams | P1 | fechada |
| P1-ORC-03 | Spec 002 draft até checklist Owner | P1 | fechada |
| P1-ORC-04 | Pack ≠ G7 código nem ANX-342 / ANX-389 done | P1 | fechada |
| P1-ORC-05 | KEEP adapter-gateway | P1 | fechada |

## Saída R8

Decision log aprovado para R9. Specs **permanecem draft**.
