---
type: debate
---
# R02 — Fronteiras: `modules/agents`

**Issue:** ANX-392 · Fontes: [structure R02](../../structure-debate/agents/R02-boundaries.md) · [PC 03](../../../../notes/anxionos-pc03-agents-debate.md)

## O módulo POSSUI

| Agregado | Responsabilidade |
| --- | --- |
| Agent | Identidade estável no tenant |
| AgentVersion | Snapshot imutável após publish |
| Skill | Catálogo declarativo (sem secrets) |
| AgentBinding | Agent↔Agency/scope |
| BrainFacade | Invocação; **sem** estado de Run |

Autonomia de investimento L0–L4 no Mandate/binding — eixo distinto de Authority L0–L6 ([governance](../governance/R02-boundaries.md)).

## O módulo NÃO POSSUI

| Item | Dono |
| --- | --- |
| Goal, Task, Run, lease, heartbeat | orchestration |
| Grant, Approval, authorityEpoch | governance |
| Nós Agent Neo4j | graph |
| Provider keys, inference.invoke | connections |
| Documentos, memória, RAG | knowledge |
| ExecutionPermit / TradeIntent | decisions |

## Non-goals

- Não criar pasta `agent-teams` (PC 04).
- Não criar pasta `capabilities` (PC 05).
- AgentVersion nunca carrega secrets.
- BrainFacade não persiste Run.

## Saída R2

Fronteira P1 alinhada ao PC 03.
