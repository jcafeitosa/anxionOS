---
type: debate
---

# R01 — Contexto: `modules/orchestration`

**Componente:** modules/orchestration  
**Rodada:** R1 — Inventário documental e de código  
**Pacote SDD:** P04  
**Data:** 2026-09-07  
**Issue debate estrutura:** ANX-42

## Propósito

Goals, Tasks, Runs, heartbeat e scheduler — delegação e retomada de trabalho de agentes.

## O que possui / não possui

### Possui (donos de estado ou composição)

- Goal
- Task
- Run
- leases
- checkpoints de tarefa produto
- scheduler

### Não possui (fronteiras ADR0002 / brain)

- Agent identity — agents
- Contexto/memória — knowledge
- Grants — governance

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | agents, graph, governance, knowledge (consulta) |
| **Downstream** | connections (inferência), audit, operations, evaluation |

## Armazenamento

PG: Goals/Tasks/Runs/leases. Neo4j: dependências, delegação, causalidade. SQLite: checkpoint coordenador dev local ≠ Task produto.

Fonte: `brain/notes/anxionos-storage-ownership.md`.

## Estado do código atual

**Ausente.**

## Perguntas abertas para debate

- Heartbeat vs lease: modelo único de liveness?
- Runs idempotentes e deduplicação com outbox?
- Scheduler central vs workers por módulo?
- Como isol scopes AGENCY vs PLATFORM no mesmo scheduler?

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
