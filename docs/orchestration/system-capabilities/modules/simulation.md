---
type: guide
title: Funcionalidades — modules/simulation
---
# Funcionalidades — `modules/simulation` (P08)

**Issue mapa:** ANX-347 · **Serial:** [PC 21](/notes/anxionos-pc21-experiments-debate.md)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules.md) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP.md) · spec 004

## Responsabilidade

Digital Twin, snapshot, diff, cenários isolados. **Não** aplica ChangeProposal — `governance` aprova; donos executam. T19 via Kernel.

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Criar snapshot, ver diff | `CreateSnapshot`, `DiffSnapshots` |
| **Operator** | Rodar cenário | `RunSimulation` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Twin worker** | `simulation.run` | Isolado; sem capital real |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `CreateSnapshot` | Snapshot | `simulation.snapshot.created.v1` |
| `RunSimulation` | Job | `simulation.run.completed.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `DiffSnapshots` | Diff T19 |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `simulation.run.completed.v1` | evaluation, graph |

## Integração

| Módulo | Borda |
| --- | --- |
| **governance** | ChangeProposal promove twin |
| **strategies** | Cenários |
| **graph** | T19 |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/simulation/src/index.ts` presente. **Não** G7.
