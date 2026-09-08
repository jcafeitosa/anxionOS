---
type: debate
---

# R01 — Contexto: `modules/agents`

**Componente:** modules/agents  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P04  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Identidade/versões de agente, skills e fachada do Brain — configuração, não execução de tasks.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Agent
- AgentVersion
- skills
- bindings
- Brain facade

### Não possui (fronteiras ADR0002 / brain)

- Goal/Task/Run — orchestration
- Memory/Evidence — knowledge
- Inferência/provider — connections

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | graph, governance, identity, organizations |
| **Downstream** | orchestration, knowledge, connections, evaluation |

## Armazenamento

PG: Agent/AgentVersion, instruções por referência, bindings. Neo4j: equipe, skills, capacidades. SQLite: cache público opcional.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Brain facade: API síncrona vs eventos para invocação?
- Paridade AP01–AP08: como registrar capabilities sem duplicar AGENCY/PLATFORM?
- Versionamento AgentVersion vs promotion evaluation?
- Skills: schema fixo ou extensível por tenant?

## Fontes

| Documento | Caminho |
| --- | --- |
| Estrutura modular (aceita) | `brain/notes/anxionos-backend-structure.md` |
| Mapa de armazenamento | `brain/notes/anxionos-storage-ownership.md` |
| SDD institucional | `brain/project-docs/specs/001-institutional-contract/spec.md` |
| ADR0002 layout modular | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` |
| Playbook orquestração | `docs/orchestration/module-development-playbook.md` |

## Próxima rodada

→ **R02 — Fronteiras** (`R02-boundaries.md`) após consenso sobre inventário R1.
