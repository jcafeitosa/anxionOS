---
type: guide
title: Funcionalidades — modules/performance
---
# Funcionalidades — `modules/performance` (P06)

**Issue mapa:** ANX-347 · **Serial:** [PC 19](/notes/anxionos-pc19-observability-debate.md) · [PC 22](/notes/anxionos-pc22-analytics-debate.md)
**Fontes:** [atlas módulos](/notes/anxionos-diagram-atlas-modules.md) · [CAPABILITY-MAP](/docs/orchestration/system-capabilities/CAPABILITY-MAP.md) · spec 003

## Responsabilidade

P&L, métricas, atribuição por estratégia/agente. Observability de plataforma é **composta** com `operations` + package observability.

## Histórias humanas

| Papel | Jornada | Command/Query |
| --- | --- | --- |
| **Owner** | Ver P&L e atribuição | `GetPnl`, `RunAttribution` |
| **Operator** | Snapshot de métricas | `GetPerformanceSnapshot` |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **CEO AGENCY** | `performance.pnl.get` | Sem mutar ledger |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `ComputeSnapshot` | Snapshot | `performance.snapshot.computed.v1` |
| `RunAttribution` | Job | `performance.attribution.completed.v1` |

## Queries (sketch)

| Query | Retorno |
| --- | --- |
| `GetPnl` | Janela + escopo |
| `GetAttribution` | Por strategy/agent |

## Eventos

| Evento | Consumidores |
| --- | --- |
| `performance.snapshot.computed.v1` | graph, evaluation |

## Integração

| Módulo | Borda |
| --- | --- |
| **accounting** | Entradas |
| **portfolios** | Posições |
| **market-data** | Analytics composto |

## Gap código

**Parcial (ANX-346/347, 2026-09-10)** — `backend/modules/performance/src/index.ts` presente. **Não** G7.
