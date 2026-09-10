---
type: guide
title: Funcionalidades — modules/agents
---
# Funcionalidades — `modules/agents` (P04)

**Issue mapa:** ANX-347 · **Serial:** [PC 03](/notes/anxionos-pc03-agents-debate) (ANX-353) · [PC 05 Capabilities](/notes/anxionos-pc05-capabilities-debate)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) · spec 002

## Responsabilidade

Agent, AgentVersion, skills, bindings de modelo, autonomia L0–L4. **Não** orquestra Runs (`orchestration`). **Não** é dono de grants (`governance`). **Não** cataloga providers (`connections`).

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Criar Agent, publicar AgentVersion, bind skill | `CreateAgent`, `PublishAgentVersion`, `BindAgentSkill` |
| **Operator** | Ver skills ativas, pausar rotina | `ListAgentSkills`, `PauseAgentRoutine` |
| **Platform** | Budget policy de runtime | `SetAgentBudgetPolicy` |

## Histórias de agente

| Agente | Capacidade | Grant |
| --- | --- | --- |
| **Brain AGENCY** | `agents.capability.list`, `agents.version.deploy` | Manifest P04; sem auto-expandir autonomia |
| **Orchestration worker** | Resolver AgentVersion no Run | Port interno |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `CreateAgent` | Registro institucional | `agents.agent.created.v1` |
| `PublishAgentVersion` | Versão imutável | `agents.version.published.v1` |
| `BindAgentSkill` | Skill + versão avaliada | `agents.skill.bound.v1` |
| `RegisterAgentRoutine` | Rotina agendada | `agents.routine.registered.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetAgentById` | Agent DTO sem secrets |
| `ListAgentSkills` | Bindings efetivos |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `agents.agent.created.v1` | graph, orchestration |
| `agents.version.published.v1` | evaluation, graph |

## Integração

| Módulo | Borda |
| --- | --- |
| **governance** | Grant + epoch antes de deploy |
| **connections** | Binding de modelo/quota |
| **orchestration** | Run consome AgentVersion |
| **evaluation** | Gate de promoção de skill |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/agents/src/index.ts` presente. **Não** G7. Sem pasta `approvals`/`policies`. Sem 24º módulo `adapter-gateway`.
