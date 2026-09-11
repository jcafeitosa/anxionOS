---
type: guide
title: Funcionalidades — modules/orchestration
---
# Funcionalidades — `modules/orchestration` (P04)

**Issue mapa:** ANX-347 · **Serial:** [PC 04](/notes/anxionos-pc04-agent-teams-debate.md) · [PC 11](/notes/anxionos-pc11-projects-debate.md) · [PC 12](/notes/anxionos-pc12-tasks-debate.md)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules.md) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP.md) · spec 002

## Responsabilidade

Goals, Tasks, Runs, heartbeats, WAITING_HUMAN_INPUT, scheduler. **Não** define Agent (`agents`). **Não** é pasta Agent Teams — times são composição com `organizations`.

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Criar Goal/Task, cancelar Run, assumir bloqueio | `CreateGoal`, `CancelTaskRun` |
| **Operator** | Dashboard de Runs, heartbeat | `ListRuns`, `GetRunHeartbeat` |
| **Platform** | Budget stop / restart from checkpoint | `StopRunForBudget`, `RestartRunFromCheckpoint` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **CEO AGENCY** | `orchestration.task.create` | Grant + escopo Agency |
| **Worker** | `orchestration.run.resume` após WAITING_HUMAN | Idempotente por runId |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `CreateGoal` | Goal versionado | `orchestration.goal.created.v1` |
| `DequeueRun` | Heartbeat + budget | — |
| `RecordGateDisposition` | Quota/gate | `orchestration.run.waiting_human.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetRunById` | Estado + checkpoint |
| `ListOpenTasks` | Agency scoped |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `orchestration.run.completed.v1` | evaluation, audit |
| `orchestration.run.waiting_human.v1` | consoles, connections |

## Integração

| Módulo | Borda |
| --- | --- |
| **agents** | AgentVersion no Run |
| **governance** | Pré-condição grant |
| **organizations** | Membership / Agent Teams conceitual |
| **knowledge** | Contexto de Run |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/orchestration/src/index.ts` presente. **Não** G7.
