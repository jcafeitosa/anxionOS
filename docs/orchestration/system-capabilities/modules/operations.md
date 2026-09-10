---
type: guide
title: Funcionalidades — modules/operations
---
# Funcionalidades — `modules/operations` (P09)

**Issue mapa:** ANX-347 · **Serial:** [PC 14](/notes/anxionos-pc14-code-debate) · [PC 17](/notes/anxionos-pc17-deployments-debate) · [PC 18](/notes/anxionos-pc18-infrastructure-debate) · [PC 20](/notes/anxionos-pc20-incidents-debate)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP) · spec 004 OP01–OP08

## Responsabilidade

Incidentes, retenção, export, recovery, procedures. Capacidades Code/Deploy/Infra da taxonomia 30 **compõem** aqui + repo/deploy — **sem** pastas novas.

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Platform** | Abrir incidente, executar procedure | `OpenIncident`, `ExecuteProcedure` |
| **Owner** | Export / retenção da Agency | `RequestExport` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Ops worker** | `operations.procedure.execute` | OP01–OP08; PLATFORM |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `OpenIncident` | Incident | `operations.incident.opened.v1` |
| `ExecuteProcedure` | ProcedureVersion | `operations.procedure.completed.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetIncident` | Estado |
| `ListProcedures` | OP01–OP08 |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `operations.incident.opened.v1` | audit, graph |

## Integração

| Módulo | Borda |
| --- | --- |
| **audit** | Replay / export |
| **performance** | Observability composta |
| **strategies** | Deploy de estratégia ≠ deploy de software |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/operations/src/index.ts` presente. **Não** G7.
